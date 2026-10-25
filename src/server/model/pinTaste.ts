// A consumable pin's taste profile (PinTaste, 0157, 0160): seven 0-5 scores, an
// editorial estimate with the sentence it rests on. One row per pin; a row set
// by hand is never overwritten by an estimate.

import * as db from '../db';
import { keepSentiment } from './reviewSentiment';
import { reviewsProblem } from '@/lib/pinReviews';
import { MAX_TASTE_REVIEWS, MAX_TASTE_REVIEW_QUOTE, TASTE_KEYS, TASTE_MAX, TASTE_SOURCES, isAbv, isTasteScore, type PinTasteJson, type TasteReview, type TasteScores, type TasteSource } from '@/lib/pinTaste';

type Row = Omit<PinTasteJson, 'checkedAt'> & { checkedAt: Date };

// numeric comes back from pg as a string; the cast gives the chart numbers.
const COLUMNS = `${TASTE_KEYS.map((key) => `"${key}"::float8 AS "${key}"`).join(', ')}, "abv"::float8 AS "abv", "abvSourceUrl", "reviews", "source", "basis", "sourceUrl", "checkedAt"`;

const toJson = (row: Row): PinTasteJson => ({ ...row, checkedAt: new Date(row.checkedAt).toISOString() });

export async function tasteForPin(pinId: number): Promise<PinTasteJson | null> {
  const [row] = await db.query<Row>(`SELECT ${COLUMNS} FROM "PinTaste" WHERE "pinId" = $1`, [pinId]);
  return row ? toJson(row) : null;
}

// The scores, or a sentence saying what is wrong with them.
export function tasteProblem(body: Record<string, unknown>): { scores: TasteScores; abv: number | null; abvSourceUrl: string | null; reviews: TasteReview[]; source: TasteSource; basis: string | null; sourceUrl: string | null } | string {
  const scores = {} as TasteScores;
  for (const key of TASTE_KEYS) {
    const value = body[key];
    if (!isTasteScore(value)) return `${key} must be a number from 0 to ${TASTE_MAX} in half steps.`;
    scores[key] = value;
  }
  if (body.abv != null && !isAbv(body.abv)) return 'abv must be a percentage from 0 to 100 with at most two decimals.';
  const abv = body.abv == null ? null : (body.abv as number);
  const abvSourceUrl = abv != null && typeof body.abvSourceUrl === 'string' && /^https?:\/\/\S+$/i.test(body.abvSourceUrl) && body.abvSourceUrl.length <= 4000 ? body.abvSourceUrl : null;
  if (abv != null && body.abvSourceUrl && !abvSourceUrl) return 'abvSourceUrl is not a web address.';
  const reviews = reviewsProblem(body.reviews, { max: MAX_TASTE_REVIEWS, maxQuote: MAX_TASTE_REVIEW_QUOTE });
  if (typeof reviews === 'string') return reviews;
  const source = String(body.source ?? 'hand') as TasteSource;
  if (!TASTE_SOURCES.includes(source)) return `source must be one of ${TASTE_SOURCES.join(', ')}.`;
  const basis = typeof body.basis === 'string' && body.basis.trim() ? body.basis.trim() : null;
  if (basis && basis.length > 1000) return 'basis is at most 1000 characters.';
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(body.sourceUrl) && body.sourceUrl.length <= 4000 ? body.sourceUrl : null;
  if (body.sourceUrl && !sourceUrl) return 'sourceUrl is not a web address.';
  return { scores, abv, abvSourceUrl, reviews, source, basis, sourceUrl };
}

// Resolves to whether it was stored (a hand row keeps winning over an estimate).
export async function saveTaste(pinId: number, scores: TasteScores, { abv, abvSourceUrl, reviews, source, basis, sourceUrl }: { abv?: number | null; abvSourceUrl?: string | null; reviews?: TasteReview[]; source: TasteSource; basis?: string | null; sourceUrl?: string | null }): Promise<boolean> {
  if (reviews) reviews = await keepSentiment('PinTaste', pinId, reviews);
  const columns = ['pinId', ...TASTE_KEYS, 'source', 'basis', 'sourceUrl', 'abv', 'abvSourceUrl', 'reviews'];
  const values = [pinId, ...TASTE_KEYS.map((key) => scores[key]), source, basis ?? null, sourceUrl ?? null, abv ?? null, abvSourceUrl ?? null, JSON.stringify(reviews ?? [])];
  const updates = columns.slice(1).map((column) => `"${column}" = EXCLUDED."${column}"`);
  const rows = await db.query(
    `INSERT INTO "PinTaste" (${columns.map((column) => `"${column}"`).join(', ')})
     VALUES (${values.map((_, i) => `$${i + 1}${columns[i] === 'reviews' ? '::jsonb' : ''}`).join(', ')})
     ON CONFLICT ("pinId") DO UPDATE SET ${updates.join(', ')}, "checkedAt" = now()
     WHERE "PinTaste"."source" <> 'hand' OR EXCLUDED."source" = 'hand'
     RETURNING "pinId"`,
    values,
  );
  return rows.length > 0;
}

export async function deleteTaste(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinTaste" WHERE "pinId" = $1`, [pinId]);
}
