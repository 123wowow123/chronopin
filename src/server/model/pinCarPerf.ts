// A vehicle pin's car performance rubric (PinCarPerf, 0167): six 0-5 scores
// (null where the spec is not published), an editorial estimate with the
// sentence it rests on. One row per pin; a row set by hand is never
// overwritten by an estimate. The sibling of ./pinTaste.

import * as db from '../db';
import { reviewsProblem } from '@/lib/pinReviews';
import { CAR_PERF_KEYS, CAR_PERF_MAX, CAR_PERF_SOURCES, MAX_CAR_PERF_REVIEWS, MAX_CAR_PERF_REVIEW_QUOTE, isCarPerfScore, type CarPerfReview, type CarPerfScores, type CarPerfSource, type PinCarPerfJson } from '@/lib/pinCarPerf';

type Row = Omit<PinCarPerfJson, 'checkedAt'> & { checkedAt: Date };

// numeric comes back from pg as a string; the cast gives the chart numbers (and keeps NULL).
const COLUMNS = `${CAR_PERF_KEYS.map((key) => `"${key}"::float8 AS "${key}"`).join(', ')}, "reviews", "source", "basis", "sourceUrl", "checkedAt"`;

const toJson = (row: Row): PinCarPerfJson => ({ ...row, checkedAt: new Date(row.checkedAt).toISOString() });

export async function carPerfForPin(pinId: number): Promise<PinCarPerfJson | null> {
  const [row] = await db.query<Row>(`SELECT ${COLUMNS} FROM "PinCarPerf" WHERE "pinId" = $1`, [pinId]);
  return row ? toJson(row) : null;
}

// The scores, or a sentence saying what is wrong with them. Every axis must be
// present: a number, or null for a spec the manufacturer does not publish.
// `reviews` is undefined when the body has no reviews key (a save then keeps
// the row's existing reviews) and a list - empty to clear them - when it does.
export function carPerfProblem(body: Record<string, unknown>): { scores: CarPerfScores; reviews: CarPerfReview[] | undefined; source: CarPerfSource; basis: string | null; sourceUrl: string | null } | string {
  const scores = {} as CarPerfScores;
  for (const key of CAR_PERF_KEYS) {
    const value = body[key];
    if (value !== null && !isCarPerfScore(value)) return `${key} must be a number from 0 to ${CAR_PERF_MAX} in half steps, or null when the spec is not published.`;
    scores[key] = value;
  }
  if (CAR_PERF_KEYS.every((key) => scores[key] === null)) return 'At least one axis needs a score.';
  const reviews = body.reviews === undefined ? undefined : reviewsProblem(body.reviews, { max: MAX_CAR_PERF_REVIEWS, maxQuote: MAX_CAR_PERF_REVIEW_QUOTE });
  if (typeof reviews === 'string') return reviews;
  const source = String(body.source ?? 'hand') as CarPerfSource;
  if (!CAR_PERF_SOURCES.includes(source)) return `source must be one of ${CAR_PERF_SOURCES.join(', ')}.`;
  const basis = typeof body.basis === 'string' && body.basis.trim() ? body.basis.trim() : null;
  if (basis && basis.length > 1000) return 'basis is at most 1000 characters.';
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(body.sourceUrl) && body.sourceUrl.length <= 4000 ? body.sourceUrl : null;
  if (body.sourceUrl && !sourceUrl) return 'sourceUrl is not a web address.';
  return { scores, reviews, source, basis, sourceUrl };
}

// Resolves to whether it was stored (a hand row keeps winning over an estimate).
// Without `reviews` the row keeps the reviews it has; [] clears them.
export async function saveCarPerf(pinId: number, scores: CarPerfScores, { reviews, source, basis, sourceUrl }: { reviews?: CarPerfReview[]; source: CarPerfSource; basis?: string | null; sourceUrl?: string | null }): Promise<boolean> {
  const columns = ['pinId', ...CAR_PERF_KEYS, 'source', 'basis', 'sourceUrl', ...(reviews ? ['reviews'] : [])];
  const values: unknown[] = [pinId, ...CAR_PERF_KEYS.map((key) => scores[key]), source, basis ?? null, sourceUrl ?? null, ...(reviews ? [JSON.stringify(reviews)] : [])];
  const updates = columns.slice(1).map((column) => `"${column}" = EXCLUDED."${column}"`);
  const rows = await db.query(
    `INSERT INTO "PinCarPerf" (${columns.map((column) => `"${column}"`).join(', ')})
     VALUES (${values.map((_, i) => `$${i + 1}${columns[i] === 'reviews' ? '::jsonb' : ''}`).join(', ')})
     ON CONFLICT ("pinId") DO UPDATE SET ${updates.join(', ')}, "checkedAt" = now()
     WHERE "PinCarPerf"."source" <> 'hand' OR EXCLUDED."source" = 'hand'
     RETURNING "pinId"`,
    values,
  );
  return rows.length > 0;
}

export async function deleteCarPerf(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinCarPerf" WHERE "pinId" = $1`, [pinId]);
}
