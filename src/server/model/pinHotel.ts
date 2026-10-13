// A hotel pin's hotel rubric (PinHotel, 0174): six 0-5 scores (null where no
// figure is published), an editorial estimate with the sentence it rests on
// and the reviews it was checked against. One row per pin; a row set by hand
// is never overwritten by an estimate. The sibling of ./pinDining.

import * as db from '../db';
import { reviewsProblem } from '@/lib/pinReviews';
import { HOTEL_KEYS, HOTEL_MAX, HOTEL_SOURCES, MAX_HOTEL_REVIEWS, MAX_HOTEL_REVIEW_QUOTE, isHotelScore, type HotelReview, type HotelScores, type HotelSource, type PinHotelJson } from '@/lib/pinHotel';

type Row = Omit<PinHotelJson, 'checkedAt'> & { checkedAt: Date };

// numeric comes back from pg as a string; the cast gives the chart numbers (and keeps NULL).
const COLUMNS = `${HOTEL_KEYS.map((key) => `"${key}"::float8 AS "${key}"`).join(', ')}, "reviews", "source", "basis", "sourceUrl", "checkedAt"`;

const toJson = (row: Row): PinHotelJson => ({ ...row, checkedAt: new Date(row.checkedAt).toISOString() });

export async function hotelForPin(pinId: number): Promise<PinHotelJson | null> {
  const [row] = await db.query<Row>(`SELECT ${COLUMNS} FROM "PinHotel" WHERE "pinId" = $1`, [pinId]);
  return row ? toJson(row) : null;
}

// The scores, or a sentence saying what is wrong with them. Every axis must be
// present: a number, or null for a figure nobody publishes. `reviews` is
// undefined when the body has no reviews key (a save then keeps the row's
// existing reviews) and a list - empty to clear them - when it does.
export function hotelProblem(body: Record<string, unknown>): {
  scores: HotelScores;
  reviews: HotelReview[] | undefined;
  source: HotelSource;
  basis: string | null;
  sourceUrl: string | null;
} | string {
  const scores = {} as HotelScores;
  for (const key of HOTEL_KEYS) {
    const value = body[key];
    if (value !== null && !isHotelScore(value)) return `${key} must be a number from 0 to ${HOTEL_MAX} in half steps, or null when no figure is published.`;
    scores[key] = value;
  }
  if (HOTEL_KEYS.every((key) => scores[key] === null)) return 'At least one axis needs a score.';
  const reviews = body.reviews === undefined ? undefined : reviewsProblem(body.reviews, { max: MAX_HOTEL_REVIEWS, maxQuote: MAX_HOTEL_REVIEW_QUOTE });
  if (typeof reviews === 'string') return reviews;
  const source = String(body.source ?? 'hand') as HotelSource;
  if (!HOTEL_SOURCES.includes(source)) return `source must be one of ${HOTEL_SOURCES.join(', ')}.`;
  const basis = typeof body.basis === 'string' && body.basis.trim() ? body.basis.trim() : null;
  if (basis && basis.length > 1000) return 'basis is at most 1000 characters.';
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(body.sourceUrl) && body.sourceUrl.length <= 4000 ? body.sourceUrl : null;
  if (body.sourceUrl && !sourceUrl) return 'sourceUrl is not a web address.';
  return { scores, reviews, source, basis, sourceUrl };
}

// Resolves to whether it was stored (a hand row keeps winning over an estimate).
// Without `reviews` the row keeps the reviews it has; [] clears them.
export async function saveHotel(
  pinId: number,
  scores: HotelScores,
  { reviews, source, basis, sourceUrl }: { reviews?: HotelReview[]; source: HotelSource; basis?: string | null; sourceUrl?: string | null },
): Promise<boolean> {
  const columns = ['pinId', ...HOTEL_KEYS, 'source', 'basis', 'sourceUrl', ...(reviews ? ['reviews'] : [])];
  const values: unknown[] = [pinId, ...HOTEL_KEYS.map((key) => scores[key]), source, basis ?? null, sourceUrl ?? null, ...(reviews ? [JSON.stringify(reviews)] : [])];
  const updates = columns.slice(1).map((column) => `"${column}" = EXCLUDED."${column}"`);
  const rows = await db.query(
    `INSERT INTO "PinHotel" (${columns.map((column) => `"${column}"`).join(', ')})
     VALUES (${values.map((_, i) => `$${i + 1}${columns[i] === 'reviews' ? '::jsonb' : ''}`).join(', ')})
     ON CONFLICT ("pinId") DO UPDATE SET ${updates.join(', ')}, "checkedAt" = now()
     WHERE "PinHotel"."source" <> 'hand' OR EXCLUDED."source" = 'hand'
     RETURNING "pinId"`,
    values,
  );
  return rows.length > 0;
}

export async function deleteHotel(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinHotel" WHERE "pinId" = $1`, [pinId]);
}
