// A restaurant pin's dining rubric (PinDining, 0170): five axes scored 0-5 in
// half steps from the venue's published diner sub-scores, critic recognition
// and independent reviews, drawn as a radar - the sibling of the taste radar
// (src/lib/pinTaste.ts) and the car performance radar (src/lib/pinCarPerf.ts).
// The anchors for each score are the rubric in docs/okf/scraping/strategy.md
// ("Dining rubric").
//
// An axis is null when no figure for it is published for the venue (a new
// restaurant has no diner scores yet): the radar draws it as "n/a" and leaves
// it out of the shape, never as a zero.

import type { PinReview } from './pinReviews';

export const DINING_AXES = [
  { key: 'food' },
  { key: 'service' },
  { key: 'ambience' },
  { key: 'value' },
  { key: 'acclaim' },
] as const;

export type DiningAxis = (typeof DINING_AXES)[number]['key'];
export const DINING_KEYS = DINING_AXES.map((axis) => axis.key) as DiningAxis[];

export const DINING_MAX = 5;
// The score from which a venue counts as strong on an axis: what dining:<axis>
// searches for.
export const DINING_STRONG = 3;
export const DINING_SOURCES = ['session', 'hand'] as const;
export type DiningSource = (typeof DINING_SOURCES)[number];

// null: no figure for this axis is published for the venue.
export type DiningScores = Record<DiningAxis, number | null>;

// A page that reviews this venue (a critic's or diner's write-up, not the
// opening announcement), with a short extract.
export type DiningReview = PinReview;
export const MAX_DINING_REVIEWS = 6;
export const MAX_DINING_REVIEW_QUOTE = 300;

export type PinDiningJson = DiningScores & {
  reviews: DiningReview[];
  source: DiningSource;
  basis: string | null;
  sourceUrl: string | null;
  checkedAt: string;
};

// A score is 0-5 in half steps; anything else is a typing mistake.
export const isDiningScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= DINING_MAX && Number.isInteger(value * 2);

// A rubric needs every axis to be a score or an explicit null, and at least
// one score: a profile of nothing but "n/a" says nothing.
export const hasDining = (dining: Partial<Record<DiningAxis, unknown>> | null | undefined): boolean =>
  !!dining && DINING_KEYS.every((key) => dining[key] === null || isDiningScore(dining[key])) && DINING_KEYS.some((key) => dining[key] !== null);
