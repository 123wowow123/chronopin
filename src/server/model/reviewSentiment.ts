// Review sentiment (PinReview.sentiment, src/lib/pinReviews.ts) kept across
// the rubric saves. A rubric save replaces its reviews column with what the
// caller sent, and a replay of the catalog scripts sends reviews with no
// score, so a save first carries over the score a stored review of the same
// url already has, then scores what is still unscored in the background
// (src/server/extract/reviewSentiment.ts; nothing without an API key, the
// reviews:sentiment backfill catches up).

import * as db from '../db';
import type { PinReview } from '@/lib/pinReviews';

type Table = 'PinTaste' | 'PinCarPerf' | 'PinGasCarPerf' | 'PinAircraftPerf' | 'PinLlmPerf' | 'PinVideoPerf' | 'PinHotel' | 'PinDining' | 'PinCriticReview';

// The reviews with the stored score of each url that arrives without one, and
// a pass at scoring the rest once the save has landed.
export async function keepSentiment<T extends PinReview>(table: Table, pinId: number, reviews: T[]): Promise<T[]> {
  const [row] = await db.query<{ reviews: PinReview[] }>(`SELECT "reviews" FROM "${table}" WHERE "pinId" = $1`, [pinId]);
  const known = new Map((row?.reviews ?? []).filter((r) => r.sentiment != null).map((r) => [r.url, r.sentiment as number]));
  const kept = reviews.map((r) => (r.sentiment == null && known.has(r.url) ? { ...r, sentiment: known.get(r.url) } : r));
  if (kept.some((r) => r.sentiment == null && r.quote)) setTimeout(() => void scoreMissing(table, pinId).catch(() => {}), 1500).unref?.();
  return kept;
}

async function scoreMissing(table: Table, pinId: number): Promise<void> {
  const { scoreReviewSentiment } = await import('../extract/reviewSentiment');
  const [row] = await db.query<{ title: string; reviews: PinReview[] }>(
    `SELECT p."title", t."reviews" FROM "${table}" t JOIN "Pin" p ON p."id" = t."pinId" WHERE t."pinId" = $1`,
    [pinId],
  );
  if (!row) return;
  let changed = false;
  for (const review of row.reviews) {
    if (review.sentiment != null || !review.quote) continue;
    const sentiment = await scoreReviewSentiment({ pinTitle: row.title, title: review.title, quote: review.quote });
    if (sentiment == null) return;
    review.sentiment = sentiment;
    changed = true;
  }
  if (changed) await db.query(`UPDATE "${table}" SET "reviews" = $1::jsonb WHERE "pinId" = $2`, [JSON.stringify(row.reviews), pinId]);
}
