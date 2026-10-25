// A restaurant pin's dining rubric (PinDining, 0170): five 0-5 scores (null
// where no figure is published), an editorial estimate with the sentence it
// rests on and the reviews it was checked against. One row per pin; a row set
// by hand is never overwritten by an estimate. The sibling of ./pinCarPerf.

import * as db from '../db';
import { keepSentiment } from './reviewSentiment';
import { reviewsProblem } from '@/lib/pinReviews';
import { DINING_KEYS, DINING_MAX, DINING_SOURCES, MAX_DINING_REVIEWS, MAX_DINING_REVIEW_QUOTE, isDiningScore, type DiningReview, type DiningScores, type DiningSource, type PinDiningJson } from '@/lib/pinDining';

type Row = Omit<PinDiningJson, 'checkedAt'> & { checkedAt: Date };

// numeric comes back from pg as a string; the cast gives the chart numbers (and keeps NULL).
const COLUMNS = `${DINING_KEYS.map((key) => `"${key}"::float8 AS "${key}"`).join(', ')}, "reviews", "source", "basis", "sourceUrl", "checkedAt"`;

const toJson = (row: Row): PinDiningJson => ({ ...row, checkedAt: new Date(row.checkedAt).toISOString() });

export async function diningForPin(pinId: number): Promise<PinDiningJson | null> {
  const [row] = await db.query<Row>(`SELECT ${COLUMNS} FROM "PinDining" WHERE "pinId" = $1`, [pinId]);
  return row ? toJson(row) : null;
}

// The scores, or a sentence saying what is wrong with them. Every axis must be
// present: a number, or null for a figure nobody publishes. `reviews` is
// undefined when the body has no reviews key (a save then keeps the row's
// existing reviews) and a list - empty to clear them - when it does.
export function diningProblem(body: Record<string, unknown>): {
  scores: DiningScores;
  reviews: DiningReview[] | undefined;
  source: DiningSource;
  basis: string | null;
  sourceUrl: string | null;
} | string {
  const scores = {} as DiningScores;
  for (const key of DINING_KEYS) {
    const value = body[key];
    if (value !== null && !isDiningScore(value)) return `${key} must be a number from 0 to ${DINING_MAX} in half steps, or null when no figure is published.`;
    scores[key] = value;
  }
  if (DINING_KEYS.every((key) => scores[key] === null)) return 'At least one axis needs a score.';
  const reviews = body.reviews === undefined ? undefined : reviewsProblem(body.reviews, { max: MAX_DINING_REVIEWS, maxQuote: MAX_DINING_REVIEW_QUOTE });
  if (typeof reviews === 'string') return reviews;
  const source = String(body.source ?? 'hand') as DiningSource;
  if (!DINING_SOURCES.includes(source)) return `source must be one of ${DINING_SOURCES.join(', ')}.`;
  const basis = typeof body.basis === 'string' && body.basis.trim() ? body.basis.trim() : null;
  if (basis && basis.length > 1000) return 'basis is at most 1000 characters.';
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(body.sourceUrl) && body.sourceUrl.length <= 4000 ? body.sourceUrl : null;
  if (body.sourceUrl && !sourceUrl) return 'sourceUrl is not a web address.';
  return { scores, reviews, source, basis, sourceUrl };
}

// Resolves to whether it was stored (a hand row keeps winning over an estimate).
// Without `reviews` the row keeps the reviews it has; [] clears them.
export async function saveDining(
  pinId: number,
  scores: DiningScores,
  { reviews, source, basis, sourceUrl }: { reviews?: DiningReview[]; source: DiningSource; basis?: string | null; sourceUrl?: string | null },
): Promise<boolean> {
  if (reviews) reviews = await keepSentiment('PinDining', pinId, reviews);
  const columns = ['pinId', ...DINING_KEYS, 'source', 'basis', 'sourceUrl', ...(reviews ? ['reviews'] : [])];
  const values: unknown[] = [pinId, ...DINING_KEYS.map((key) => scores[key]), source, basis ?? null, sourceUrl ?? null, ...(reviews ? [JSON.stringify(reviews)] : [])];
  const updates = columns.slice(1).map((column) => `"${column}" = EXCLUDED."${column}"`);
  const rows = await db.query(
    `INSERT INTO "PinDining" (${columns.map((column) => `"${column}"`).join(', ')})
     VALUES (${values.map((_, i) => `$${i + 1}${columns[i] === 'reviews' ? '::jsonb' : ''}`).join(', ')})
     ON CONFLICT ("pinId") DO UPDATE SET ${updates.join(', ')}, "checkedAt" = now()
     WHERE "PinDining"."source" <> 'hand' OR EXCLUDED."source" = 'hand'
     RETURNING "pinId"`,
    values,
  );
  return rows.length > 0;
}

export async function deleteDining(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinDining" WHERE "pinId" = $1`, [pinId]);
}
