// Independent critic reviews for a pin with no rubric table of its own (a
// game, a film, a series, an album, a gadget): PinCriticReview (0215). The
// same review shape the rubric tables keep (src/lib/pinReviews.ts), so the
// pin's "Sentiment over time" graph reads them alike.

import type { PinReview } from './pinReviews';

export const MAX_CRITIC_REVIEWS = 8;
export const MAX_CRITIC_REVIEW_QUOTE = 300;
export const CRITIC_REVIEW_SOURCES = ['session', 'hand'] as const;
export type CriticReviewSource = (typeof CRITIC_REVIEW_SOURCES)[number];

export type PinCriticReviewsJson = {
  reviews: PinReview[];
  source: CriticReviewSource;
  basis: string | null;
  sourceUrl: string | null;
  checkedAt: string;
};
