import { cacheLife, cacheTag } from 'next/cache';
import { blobUrl } from '@/lib/appConfig';
import { RESTAURANT_REGIONS, openingDateLabel, openingGroup, type Restaurant, type TopRestaurant } from '@/lib/restaurants';
import { dayKeyIn } from '@/lib/format';
import { listRestaurantContent } from '@/server/model/restaurantContent';
import { restaurantSourceKey } from '@/lib/restaurantMenus';
import type { RestaurantTile } from '@/server/restaurantContentValidation';
import { listSpecialVenues } from '@/server/model/restaurantSpecialVenue';
import { toJson, type PinJson } from '@/lib/types';
import * as db from '@/server/db';
import Pins from '@/server/model/pins';
import Pin from '@/server/model/pin';
import { TAGS } from './cache';

const CUISINES = new Set(['Mexican', 'Mediterranean', 'Cafe', 'Sandwiches', 'Japanese', 'Chinese', 'Italian', 'Greek', 'Spanish', 'Hawaiian', 'American', 'European', 'Brazilian', 'French', 'Californian', 'Afro-Asian', 'Asian', 'Vegetarian', 'Seafood', 'Oaxacan']);

// Every region's guide reads the whole content table (profiles carry the menus);
// loaded once per cache window, not once per region (~100x in the restaurant sitemap).
async function allRestaurantContent() {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.restaurantContent);
  return listRestaurantContent({ includeDisabled: true });
}

export async function restaurantGuideRegionSlugs(): Promise<string[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  cacheTag(TAGS.restaurantContent);
  // Match the guide's live opening query without hydrating every city's pins and media.
  const records = await allRestaurantContent();
  const catalog = records.filter((record) => record.enabled && record.profile.tile?.kind === 'top').map((record) => ({ ...record.profile.tile!, sourceUrl: record.profile.pinSourceUrl }));
  const [openings, pins, specialVenues] = await Promise.all([
    db.query<{ city: string; day: string; dateConfidence: string | null; sourceUrl: string | null }>(
      `SELECT "city"."name" AS "city", to_char("p"."utcStartDateTime", 'YYYY-MM-DD') AS "day",
              "p"."dateConfidence", "p"."sourceUrl"
       FROM "Pin" AS "p" LEFT JOIN "PinTag" AS "city" ON "city"."pinId" = "p"."id" AND "city"."name" = ANY($1::citext[])
       WHERE "p"."utcDeletedDateTime" IS NULL AND "p"."utcStartDateTime" IS NOT NULL
         AND (("city"."name" IS NOT NULL
         AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = 'Restaurant Opening')
         AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = 'Food' AND "t"."kind" = 'category')) OR "p"."sourceUrl" = ANY($2::text[]))`,
      [RESTAURANT_REGIONS.map((region) => region.name), records.filter((record) => record.enabled && record.profile.tile?.kind === 'opening').map((record) => record.profile.pinSourceUrl)],
    ),
    Pin.findBySourceUrls(catalog.map((restaurant) => restaurant.sourceUrl)),
    listSpecialVenues(),
  ]);
  const populated = new Set([...specialVenues.filter((restaurant) => restaurant.profile.specials.length).map((restaurant) => restaurant.regionSlug)]);
  for (const restaurant of catalog) {
    if (pins.has(restaurant.sourceUrl)) populated.add(restaurant.regionSlug);
  }
  const now = new Date();
  // Each opening's catalog record, found once: looking it up inside the region
  // loop re-parsed every record's URL for every region and opening (~1s).
  const recordByKey = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    const key = restaurantSourceKey(record.profile.pinSourceUrl);
    if (!recordByKey.has(key)) recordByKey.set(key, record);
  }
  const openingRecords = openings.map((opening) => ({ opening, record: recordByKey.get(restaurantSourceKey(opening.sourceUrl ?? '')) }));
  for (const region of RESTAURANT_REGIONS) {
    const today = dayKeyIn(now, region.timeZone);
    if (openingRecords.some(({ opening, record }) => {
      if (record && (!record.enabled || (record.profile.tile && (record.profile.tile.kind !== 'opening' || record.profile.tile.regionSlug !== region.slug)))) return false;
      if (!record?.profile.tile && opening.city?.toLowerCase() !== region.name.toLowerCase()) return false;
      const catalogOpening = record?.profile.tile;
      const confirmed = opening.dateConfidence === 'confirmed' || (catalogOpening?.openingConfirmed === true && catalogOpening.day === opening.day);
      return !!openingGroup({ day: opening.day, confirmed }, today);
    })) populated.add(region.slug);
  }
  return RESTAURANT_REGIONS.filter((region) => populated.has(region.slug)).map((region) => region.slug);
}

export async function regionalTopRestaurants(regionSlug: string): Promise<TopRestaurant[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  cacheTag(TAGS.restaurantContent);
  const records = await listRestaurantContent({ region: regionSlug });
  const catalog = records.filter((record) => record.profile.tile?.kind === 'top');
  const pins = await Pin.findBySourceUrls(catalog.map((record) => record.profile.pinSourceUrl));
  return catalog.flatMap((record) => {
    const restaurant = record.profile.tile!;
    const pin = pins.get(record.profile.pinSourceUrl);
    if (!pin) return [];
    const kidsFriendly = restaurant.kidsFriendly ?? record.profile.details?.kidsFriendly;
    return [{ ...restaurant, sourceUrl: record.profile.pinSourceUrl, pinId: pin.id, pinTitle: pin.title, ...(kidsFriendly ? { kidsFriendly } : {}) }];
  });
}

export function restaurantOf(pin: PinJson, city: string, tile?: RestaurantTile): Restaurant | null {
  if (!pin.utcStartDateTime) return null;
  const day = pin.utcStartDateTime.slice(0, 10);
  const tags = (pin.tags ?? []).map((tag) => tag.name);
  const cuisine = tags.find((tag) => CUISINES.has(tag)) ?? 'Restaurant';
  const neighborhood = tags.find((tag) => !CUISINES.has(tag) && ![...RESTAURANT_REGIONS.map((region) => region.name), 'Restaurant Opening', 'Restaurant', 'Restaurants', 'Top Restaurants', 'Food', 'Thread'].includes(tag)) ?? city;
  const catalog = tile;
  const picture = pin.media?.find((medium) => Number(medium.type) === 1);
  const summary = pin.longFormSummary ?? '';
  const estimated = pin.dateConfidence === 'estimated' || pin.dateConfidence === 'unknown' || !pin.dateConfidence;
  const imageNote = /architectural renderings|project renderings/.test(summary) ? 'Architectural rendering'
    : /founding team/.test(summary) && pin.id === 6429 ? 'Founding team'
    : /previous tenant|existing Fish Guts building/.test(summary) ? 'Existing building · before opening' : null;
  const tagKids = tags.some((tag) => /^(?:kids?|family|children)(?: friendly)?$/i.test(tag));
  const kidsFriendly = tile?.kidsFriendly ?? (tagKids ? true : undefined);
  return {
    id: pin.id, title: pin.title, name: tile?.name ?? pin.company ?? pin.title, description: tile?.description ?? pin.description ?? '', day,
    // An opening can be verified even when reporting supplies only its month.
    // Do not apply that verification after the live pin's date has changed.
    dateLabel: openingDateLabel(day, estimated, pin.dateConfidenceReasoning || ''), estimated, confirmed: pin.dateConfidence === 'confirmed' || (catalog?.openingConfirmed === true && catalog.day === day),
    neighborhood: catalog?.neighborhood ?? neighborhood, cuisine: catalog?.cuisine ?? (cuisine === 'Cafe' ? 'Café & wine bar' : cuisine),
    image: tile ? tile.image : picture ? blobUrl(picture.thumbName) ?? picture.originalUrl ?? null : null,
    imageNote: catalog?.imageNote ?? imageNote, address: tile?.address ?? pin.address ?? '',
    priceRange: tile?.priceRange || undefined,
    sourceUrl: pin.sourceUrl,
    ...(kidsFriendly ? { kidsFriendly } : {}),
  };
}

// The live pins one region's guide lists: its city's Restaurant Opening pins in
// Food, plus the catalog's opening records for it. $1 city, $2 opening sources.
const REGIONAL_OPENINGS = `"p"."utcDeletedDateTime" IS NULL
       AND ((EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = $1::citext)
       AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = 'Restaurant Opening')
       AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = 'Food' AND "t"."kind" = 'category')) OR "p"."sourceUrl" = ANY($2::text[]))`;

// Whether a record keeps its pin in this region's guide.
function listedInRegion(record: Awaited<ReturnType<typeof allRestaurantContent>>[number] | undefined, regionSlug: string | undefined): boolean {
  return !record || (record.enabled && (!record.profile.tile || (record.profile.tile.kind === 'opening' && record.profile.tile.regionSlug === regionSlug)));
}

// Each opening's day and confirmation, as regionalRestaurants would report them,
// without hydrating the pins (tags, media): all the guide counts and the
// restaurant sitemap need.
export async function regionalOpeningDays(city: string): Promise<{ day: string; confirmed: boolean }[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  cacheTag(TAGS.restaurantContent);
  const region = RESTAURANT_REGIONS.find((r) => r.name === city);
  const records = await allRestaurantContent();
  const tiles = new Map(records.map((record) => [restaurantSourceKey(record.profile.pinSourceUrl), record]));
  const openingSources = records.filter((record) => record.enabled && record.profile.tile?.kind === 'opening' && record.profile.tile.regionSlug === region?.slug).map((record) => record.profile.pinSourceUrl);
  const rows = await db.query<{ day: string; dateConfidence: string | null; sourceUrl: string | null }>(
    `SELECT to_char("p"."utcStartDateTime", 'YYYY-MM-DD') AS "day", "p"."dateConfidence", "p"."sourceUrl"
     FROM "Pin" AS "p" WHERE "p"."utcStartDateTime" IS NOT NULL AND ${REGIONAL_OPENINGS}`, [city, openingSources],
  );
  return rows.flatMap((row) => {
    const record = tiles.get(restaurantSourceKey(row.sourceUrl ?? ''));
    if (!listedInRegion(record, region?.slug)) return [];
    const tile = record?.profile.tile;
    return [{ day: row.day, confirmed: row.dateConfidence === 'confirmed' || (tile?.openingConfirmed === true && tile.day === row.day) }];
  });
}

export async function regionalRestaurants(city: string): Promise<{ restaurants: Restaurant[]; previewSnapshot: boolean }> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  cacheTag(TAGS.restaurantContent);
  const region = RESTAURANT_REGIONS.find((r) => r.name === city);
  const records = await allRestaurantContent();
  const tiles = new Map(records.map((record) => [restaurantSourceKey(record.profile.pinSourceUrl), record]));
  const openingSources = records.filter((record) => record.enabled && record.profile.tile?.kind === 'opening' && record.profile.tile.regionSlug === region?.slug).map((record) => record.profile.pinSourceUrl);
  const rows = await db.query<{ id: number }>(
    `SELECT "p"."id" FROM "Pin" AS "p" WHERE ${REGIONAL_OPENINGS} ORDER BY "p"."utcStartDateTime", "p"."id"`, [city, openingSources],
  );
  let pins = rows.length ? toJson<PinJson[]>((await Pins.queryByIds(rows.map((row) => row.id))).pins) : [];
  const previewSnapshot = process.env.NODE_ENV === 'development' && !pins.length && city === 'San Diego';
  // Local data predates the published batch. Production always uses live pins,
  // including deletions and new regional openings, never this preview snapshot.
  if (previewSnapshot) {
    const { default: snapshot } = await import('@/server/data/sanDiegoRestaurants.preview.json');
    pins = snapshot.map((pin) => ({ ...pin, media: pin.media.map((medium) => ({ ...medium, thumbName: `https://chronopin.blob.core.windows.net/thumb/${medium.thumbName}` })) })) as unknown as PinJson[];
  }
  return { restaurants: pins.filter((pin) => listedInRegion(tiles.get(restaurantSourceKey(pin.sourceUrl ?? '')), region?.slug)).map((pin) => restaurantOf(pin, city, tiles.get(restaurantSourceKey(pin.sourceUrl ?? ''))?.profile.tile)).filter((r): r is Restaurant => !!r), previewSnapshot };
}
