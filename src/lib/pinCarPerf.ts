// A vehicle pin's car performance rubric (PinCarPerf, 0167): six axes scored
// 0-5 in half steps from the model's published specs and drawn as a radar, the
// sibling of the taste radar (src/lib/pinTaste.ts). The anchors for each score
// are the rubric in docs/okf/scraping/strategy.md ("Car performance rubric").
//
// An axis is null when the spec it rests on is not published for the model:
// the radar draws it as "n/a" and leaves it out of the shape, never as a zero.

import type { PinReview } from './pinReviews';

export const CAR_PERF_AXES = [
  { key: 'range' },
  { key: 'charging' },
  { key: 'acceleration' },
  { key: 'assistance' },
  { key: 'space' },
  { key: 'value' },
] as const;

export type CarPerfAxis = (typeof CAR_PERF_AXES)[number]['key'];
export const CAR_PERF_KEYS = CAR_PERF_AXES.map((axis) => axis.key) as CarPerfAxis[];

export const CAR_PERF_MAX = 5;
// The score from which a car counts as strong on an axis: what carperf:<axis>
// searches for.
export const CAR_PERF_STRONG = 3;
export const CAR_PERF_SOURCES = ['session', 'hand'] as const;
export type CarPerfSource = (typeof CAR_PERF_SOURCES)[number];

// null: the spec for this axis is not published for the model.
export type CarPerfScores = Record<CarPerfAxis, number | null>;

// A page that reviews how the model drives or performs (a road test, not the
// launch announcement), with a short extract.
export type CarPerfReview = PinReview;
export const MAX_CAR_PERF_REVIEWS = 6;
export const MAX_CAR_PERF_REVIEW_QUOTE = 300;

export type PinCarPerfJson = CarPerfScores & {
  // Independent reviews the scores were checked against, best first.
  reviews: CarPerfReview[];
  source: CarPerfSource;
  basis: string | null;
  sourceUrl: string | null;
  checkedAt: string;
};

// A score is 0-5 in half steps; anything else is a typing mistake.
export const isCarPerfScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= CAR_PERF_MAX && Number.isInteger(value * 2);

// A rubric needs every axis to be a score or an explicit null, and at least
// one score: a profile of nothing but "n/a" says nothing.
export const hasCarPerf = (perf: Partial<Record<CarPerfAxis, unknown>> | null | undefined): boolean =>
  !!perf && CAR_PERF_KEYS.every((key) => perf[key] === null || isCarPerfScore(perf[key])) && CAR_PERF_KEYS.some((key) => perf[key] !== null);
