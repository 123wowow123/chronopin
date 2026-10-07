import { cacheLife, cacheTag } from 'next/cache';
import { blobUrl } from '@/lib/appConfig';
import { RESTAURANT_REGIONS, openingDateLabel, type Restaurant, type TopRestaurant } from '@/lib/restaurants';
import topRestaurants from '@/server/data/topRestaurants.json';
import regionalCatalog from '@/server/data/regionalRestaurants.json';
import { toJson, type PinJson } from '@/lib/types';
import * as db from '@/server/db';
import Pins from '@/server/model/pins';
import Pin from '@/server/model/pin';
import { TAGS } from './cache';
import { restaurantPriceRange } from '../restaurantPrice';

const CUISINES = new Set(['Mexican', 'Mediterranean', 'Cafe', 'Sandwiches', 'Japanese', 'Chinese', 'Italian', 'Greek', 'Spanish', 'Hawaiian', 'American', 'European', 'Brazilian', 'French', 'Californian', 'Afro-Asian', 'Asian', 'Vegetarian', 'Seafood', 'Oaxacan']);

export async function regionalTopRestaurants(regionSlug: string): Promise<TopRestaurant[]> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  const catalog = regionalCatalog.filter((restaurant) => restaurant.regionSlug === regionSlug && restaurant.kind === 'top');
  const pins = await Pin.findBySourceUrls(catalog.map((restaurant) => restaurant.sourceUrl));
  const curated = catalog.flatMap((restaurant) => {
    const pin = pins.get(restaurant.sourceUrl);
    if (!pin) return [];
    return [{ ...restaurant, pinId: pin.id, pinTitle: pin.title, image: restaurant.image!, recognition: restaurant.recognition!, priceRange: restaurant.priceRange!, imageCredit: restaurant.imageCredit! }];
  });
  return [...topRestaurants.filter((restaurant) => restaurant.regionSlug === regionSlug), ...curated];
}

export function restaurantOf(pin: PinJson, city: string): Restaurant | null {
  if (!pin.utcStartDateTime) return null;
  const day = pin.utcStartDateTime.slice(0, 10);
  const tags = (pin.tags ?? []).map((tag) => tag.name);
  const cuisine = tags.find((tag) => CUISINES.has(tag)) ?? 'Restaurant';
  const neighborhood = tags.find((tag) => !CUISINES.has(tag) && ![...RESTAURANT_REGIONS.map((region) => region.name), 'Restaurant Opening', 'Restaurant', 'Restaurants', 'Top Restaurants', 'Food', 'Thread'].includes(tag)) ?? city;
  const catalog = regionalCatalog.find((restaurant) => restaurant.kind === 'opening' && restaurant.sourceUrl === pin.sourceUrl);
  const picture = pin.media?.find((medium) => Number(medium.type) === 1);
  const summary = pin.longFormSummary ?? '';
  const estimated = pin.dateConfidence === 'estimated' || pin.dateConfidence === 'unknown' || !pin.dateConfidence;
  const imageNote = /architectural renderings|project renderings/.test(summary) ? 'Architectural rendering'
    : /founding team/.test(summary) && pin.id === 6429 ? 'Founding team'
    : /previous tenant|existing Fish Guts building/.test(summary) ? 'Existing building · before opening' : null;
  return {
    id: pin.id, title: pin.title, name: pin.company || pin.title, description: pin.description || '', day,
    // An opening can be verified even when reporting supplies only its month.
    // Do not apply that verification after the live pin's date has changed.
    dateLabel: openingDateLabel(day, estimated, pin.dateConfidenceReasoning || ''), estimated, confirmed: pin.dateConfidence === 'confirmed' || (catalog?.openingConfirmed === true && catalog.day === day),
    neighborhood: catalog?.neighborhood ?? neighborhood, cuisine: catalog?.cuisine ?? (cuisine === 'Cafe' ? 'Café & wine bar' : cuisine),
    image: picture ? blobUrl(picture.thumbName) ?? picture.originalUrl ?? null : null,
    imageNote: catalog?.imageNote ?? imageNote, address: pin.address || '',
    priceRange: restaurantPriceRange(pin.sourceUrl),
  };
}

export async function regionalRestaurants(city: string): Promise<{ restaurants: Restaurant[]; previewSnapshot: boolean }> {
  'use cache';
  cacheLife('minutes');
  cacheTag(TAGS.timeline);
  const rows = await db.query<{ id: number }>(
    `SELECT "p"."id" FROM "Pin" AS "p"
     WHERE "p"."utcDeletedDateTime" IS NULL
       AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = $1::citext)
       AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = 'Restaurant Opening')
       AND EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = 'Food' AND "t"."kind" = 'category')
     ORDER BY "p"."utcStartDateTime", "p"."id"`, [city],
  );
  let pins = rows.length ? toJson<PinJson[]>((await Pins.queryByIds(rows.map((row) => row.id))).pins) : [];
  const previewSnapshot = process.env.NODE_ENV === 'development' && !pins.length && city === 'San Diego';
  // Local data predates the published batch. Production always uses live pins,
  // including deletions and new regional openings, never this preview snapshot.
  if (previewSnapshot) {
    const { default: snapshot } = await import('@/server/data/sanDiegoRestaurants.preview.json');
    pins = snapshot.map((pin) => ({ ...pin, media: pin.media.map((medium) => ({ ...medium, thumbName: `https://chronopin.blob.core.windows.net/thumb/${medium.thumbName}` })) })) as unknown as PinJson[];
  }
  return { restaurants: pins.map((pin) => restaurantOf(pin, city)).filter((r): r is Restaurant => !!r), previewSnapshot };
}
