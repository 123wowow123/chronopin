// An AI video model version pin's rubric (PinVideoPerf, 0210): six scores (null
// where the spec is not published) with the sentence they rest on. One row per
// pin; a row set by hand is never overwritten by an estimate. The sibling of
// ./pinAircraftPerf.

import * as db from '../db';
import { reviewsProblem, type PinReview } from '@/lib/pinReviews';
import { rubricYearProblem } from '@/lib/rubricYear';
import {
  VIDEO_PERF_KEYS, VIDEO_PERF_MAX, VIDEO_PERF_RUBRIC_YEAR, VIDEO_PERF_SOURCES, MAX_VIDEO_PERF_REVIEWS, MAX_VIDEO_PERF_REVIEW_QUOTE,
  isVideoPerfScore, type VideoPerfScores, type VideoPerfSource, type PinVideoPerfJson,
} from '@/lib/pinVideoPerf';

type Row = Omit<PinVideoPerfJson, 'checkedAt'> & { checkedAt: Date };

const COLUMNS = `${VIDEO_PERF_KEYS.map((key) => `"${key}"::float8 AS "${key}"`).join(', ')}, "reviews", "source", "basis", "sourceUrl", "rubricYear", "checkedAt"`;

export async function videoPerfForPin(pinId: number): Promise<PinVideoPerfJson | null> {
  const [row] = await db.query<Row>(`SELECT ${COLUMNS} FROM "PinVideoPerf" WHERE "pinId" = $1`, [pinId]);
  return row ? { ...row, checkedAt: new Date(row.checkedAt).toISOString() } : null;
}

// The scores, or a sentence saying what is wrong with them.
export function videoPerfProblem(body: Record<string, unknown>): {
  scores: VideoPerfScores;
  reviews: PinReview[] | undefined;
  rubricYear: number | undefined;
  source: VideoPerfSource;
  basis: string | null;
  sourceUrl: string | null;
} | string {
  const scores = {} as VideoPerfScores;
  for (const key of VIDEO_PERF_KEYS) {
    const value = body[key];
    if (value !== null && !isVideoPerfScore(value)) return `${key} must be a number from 0 to ${VIDEO_PERF_MAX} in half steps, or null when the spec is not published.`;
    scores[key] = value;
  }
  if (VIDEO_PERF_KEYS.every((key) => scores[key] === null)) return 'At least one axis needs a score.';
  const reviews = body.reviews === undefined ? undefined : reviewsProblem(body.reviews, { max: MAX_VIDEO_PERF_REVIEWS, maxQuote: MAX_VIDEO_PERF_REVIEW_QUOTE });
  if (typeof reviews === 'string') return reviews;
  const rubricYear = rubricYearProblem(body.rubricYear);
  if (typeof rubricYear === 'string') return rubricYear;
  const source = String(body.source ?? 'hand') as VideoPerfSource;
  if (!VIDEO_PERF_SOURCES.includes(source)) return `source must be one of ${VIDEO_PERF_SOURCES.join(', ')}.`;
  const basis = typeof body.basis === 'string' && body.basis.trim() ? body.basis.trim() : null;
  if (basis && basis.length > 1000) return 'basis is at most 1000 characters.';
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(body.sourceUrl) && body.sourceUrl.length <= 4000 ? body.sourceUrl : null;
  if (body.sourceUrl && !sourceUrl) return 'sourceUrl is not a web address.';
  return { scores, reviews, rubricYear, source, basis, sourceUrl };
}

// Resolves to whether it was stored (a hand row keeps winning over an estimate).
export async function saveVideoPerf(
  pinId: number,
  scores: VideoPerfScores,
  { reviews, rubricYear, source, basis, sourceUrl }: { reviews?: PinReview[]; rubricYear?: number; source: VideoPerfSource; basis?: string | null; sourceUrl?: string | null },
): Promise<boolean> {
  const columns = ['pinId', ...VIDEO_PERF_KEYS, 'source', 'basis', 'sourceUrl', 'rubricYear', ...(reviews ? ['reviews'] : [])];
  const values: unknown[] = [pinId, ...VIDEO_PERF_KEYS.map((key) => scores[key]), source, basis ?? null, sourceUrl ?? null, rubricYear ?? VIDEO_PERF_RUBRIC_YEAR, ...(reviews ? [JSON.stringify(reviews)] : [])];
  const updates = columns.slice(1).filter((column) => column !== 'rubricYear' || rubricYear !== undefined).map((column) => `"${column}" = EXCLUDED."${column}"`);
  const rows = await db.query(
    `INSERT INTO "PinVideoPerf" (${columns.map((column) => `"${column}"`).join(', ')})
     VALUES (${values.map((_, i) => `$${i + 1}${columns[i] === 'reviews' ? '::jsonb' : ''}`).join(', ')})
     ON CONFLICT ("pinId") DO UPDATE SET ${updates.join(', ')}, "checkedAt" = now()
     WHERE "PinVideoPerf"."source" <> 'hand' OR EXCLUDED."source" = 'hand'
     RETURNING "pinId"`,
    values,
  );
  return rows.length > 0;
}

export async function deleteVideoPerf(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinVideoPerf" WHERE "pinId" = $1`, [pinId]);
}
