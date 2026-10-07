import { cacheLife, cacheTag } from 'next/cache';
import { blobUrl } from '@/lib/appConfig';
import { openingDateLabel, type Restaurant, type TopRestaurant } from '@/lib/restaurants';
import topRestaurants from '@/server/data/topRestaurants.json';
import { toJson, type PinJson } from '@/lib/types';
import * as db from '@/server/db';
import Pins from '@/server/model/pins';
import { TAGS } from './cache';

const CUISINES = new Set(['Mexican', 'Mediterranean', 'Cafe', 'Sandwiches', 'Japanese', 'Chinese', 'Italian', 'Greek', 'Spanish']);

export function regionalTopRestaurants(regionSlug: string): TopRestaurant[] {
  return topRestaurants.filter((restaurant) => restaurant.regionSlug === regionSlug);
}

function restaurantOf(pin: PinJson): Restaurant | null {
  if (!pin.utcStartDateTime) return null;
  const day = pin.utcStartDateTime.slice(0, 10);
  const tags = (pin.tags ?? []).map((tag) => tag.name);
  const cuisine = tags.find((tag) => CUISINES.has(tag)) ?? 'Restaurant';
  const neighborhood = tags.find((tag) => !CUISINES.has(tag) && !['San Diego', 'Restaurant Opening', 'Food', 'Thread'].includes(tag)) ?? 'San Diego';
  const picture = pin.media?.find((medium) => Number(medium.type) === 1);
  const summary = pin.longFormSummary ?? '';
  const estimated = pin.dateConfidence === 'estimated' || pin.dateConfidence === 'unknown' || !pin.dateConfidence;
  const imageNote = /architectural renderings|project renderings/.test(summary) ? 'Architectural rendering'
    : /founding team/.test(summary) && pin.id === 6429 ? 'Founding team'
    : /previous tenant|existing Fish Guts building/.test(summary) ? 'Existing building · before opening' : null;
  return {
    id: pin.id, title: pin.title, name: pin.company || pin.title, description: pin.description || '', day,
    dateLabel: openingDateLabel(day, estimated, pin.dateConfidenceReasoning || ''), estimated, confirmed: pin.dateConfidence === 'confirmed',
    neighborhood, cuisine: cuisine === 'Cafe' ? 'Café & wine bar' : cuisine,
    image: picture ? blobUrl(picture.thumbName) ?? picture.originalUrl ?? null : null,
    imageNote, address: pin.address || '',
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
  return { restaurants: pins.map(restaurantOf).filter((r): r is Restaurant => !!r), previewSnapshot };
}
