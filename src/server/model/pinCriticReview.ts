// A pin's independent critic reviews (PinCriticReview, 0215) for pins with no
// rubric table of their own. One row per pin; a row set by hand is never
// overwritten by a collection. Scores on the reviews (PinReview.sentiment)
// survive a re-save of the same urls (./reviewSentiment.ts).

import * as db from '../db';
import { reviewsProblem } from '@/lib/pinReviews';
import { CRITIC_REVIEW_SOURCES, MAX_CRITIC_REVIEWS, MAX_CRITIC_REVIEW_QUOTE, type CriticReviewSource, type PinCriticReviewsJson } from '@/lib/pinCriticReviews';
import type { PinReview } from '@/lib/pinReviews';
import { keepSentiment } from './reviewSentiment';

type Row = Omit<PinCriticReviewsJson, 'checkedAt'> & { checkedAt: Date };

const COLUMNS = `"reviews", "source", "basis", "sourceUrl", "checkedAt"`;

export async function criticReviewsForPin(pinId: number): Promise<PinCriticReviewsJson | null> {
  const [row] = await db.query<Row>(`SELECT ${COLUMNS} FROM "PinCriticReview" WHERE "pinId" = $1`, [pinId]);
  return row && row.reviews.length ? { ...row, checkedAt: new Date(row.checkedAt).toISOString() } : null;
}

// The reviews and where they came from, or a sentence saying what is wrong with them.
export function criticReviewsProblem(body: Record<string, unknown>): { reviews: PinReview[]; source: CriticReviewSource; basis: string | null; sourceUrl: string | null } | string {
  const reviews = reviewsProblem(body.reviews, { max: MAX_CRITIC_REVIEWS, maxQuote: MAX_CRITIC_REVIEW_QUOTE });
  if (typeof reviews === 'string') return reviews;
  if (!reviews.length) return 'reviews needs at least one review.';
  const source = String(body.source ?? 'session') as CriticReviewSource;
  if (!CRITIC_REVIEW_SOURCES.includes(source)) return `source must be one of ${CRITIC_REVIEW_SOURCES.join(', ')}.`;
  const basis = typeof body.basis === 'string' && body.basis.trim() ? body.basis.trim() : null;
  if (basis && basis.length > 1000) return 'basis is at most 1000 characters.';
  const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/i.test(body.sourceUrl) && body.sourceUrl.length <= 4000 ? body.sourceUrl : null;
  if (body.sourceUrl && !sourceUrl) return 'sourceUrl is not a web address.';
  return { reviews, source, basis, sourceUrl };
}

// Resolves to whether it was stored (a hand row keeps winning over a collection).
export async function saveCriticReviews(pinId: number, { reviews, source, basis, sourceUrl }: { reviews: PinReview[]; source: CriticReviewSource; basis?: string | null; sourceUrl?: string | null }): Promise<boolean> {
  const kept = await keepSentiment('PinCriticReview', pinId, reviews);
  const rows = await db.query(
    `INSERT INTO "PinCriticReview" ("pinId", "reviews", "source", "basis", "sourceUrl")
     VALUES ($1, $2::jsonb, $3, $4, $5)
     ON CONFLICT ("pinId") DO UPDATE SET "reviews" = EXCLUDED."reviews", "source" = EXCLUDED."source", "basis" = EXCLUDED."basis", "sourceUrl" = EXCLUDED."sourceUrl", "checkedAt" = now()
     WHERE "PinCriticReview"."source" <> 'hand' OR EXCLUDED."source" = 'hand'
     RETURNING "pinId"`,
    [pinId, JSON.stringify(kept), source, basis ?? null, sourceUrl ?? null],
  );
  return rows.length > 0;
}

export async function deleteCriticReviews(pinId: number): Promise<void> {
  await db.query(`DELETE FROM "PinCriticReview" WHERE "pinId" = $1`, [pinId]);
}
