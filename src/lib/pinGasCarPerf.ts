// A gasoline car pin's performance rubric (PinGasCarPerf, 0173): seven axes
// scored 0-5 in half steps from the model's published specs, the sibling of
// the electric rubric (src/lib/pinCarPerf.ts) with the axes that matter for a
// combustion car. Anchors: docs/okf/scraping/strategy.md ("Gasoline car
// rubric"). An axis is null when the spec is not published for the model.

import type { PinReview } from './pinReviews';

export const GAS_CAR_PERF_RUBRIC_YEAR = 2026;

export const GAS_CAR_PERF_AXES = [
  { key: 'power', label: 'Power' },
  { key: 'acceleration', label: 'Acceleration' },
  { key: 'economy', label: 'Fuel economy' },
  { key: 'handling', label: 'Handling' },
  { key: 'space', label: 'Space & comfort' },
  { key: 'value', label: 'Value' },
  { key: 'kidsFriendly', label: 'Kids friendly' },
] as const;

export type GasCarPerfAxis = (typeof GAS_CAR_PERF_AXES)[number]['key'];
export const GAS_CAR_PERF_KEYS = GAS_CAR_PERF_AXES.map((axis) => axis.key) as GasCarPerfAxis[];
export const GAS_CAR_PERF_MAX = 5;
export const GAS_CAR_PERF_SOURCES = ['session', 'hand'] as const;
export type GasCarPerfSource = (typeof GAS_CAR_PERF_SOURCES)[number];
export type GasCarPerfScores = Record<GasCarPerfAxis, number | null>;
export const MAX_GAS_CAR_PERF_REVIEWS = 6;
export const MAX_GAS_CAR_PERF_REVIEW_QUOTE = 300;

export type PinGasCarPerfJson = GasCarPerfScores & {
  reviews: PinReview[];
  source: GasCarPerfSource;
  basis: string | null;
  sourceUrl: string | null;
  rubricYear: number;
  checkedAt: string;
};

export const isGasCarPerfScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= GAS_CAR_PERF_MAX && Number.isInteger(value * 2);

export const hasGasCarPerf = (perf: Partial<Record<GasCarPerfAxis, unknown>> | null | undefined): boolean =>
  !!perf && GAS_CAR_PERF_KEYS.every((key) => perf[key] === null || isGasCarPerfScore(perf[key])) && GAS_CAR_PERF_KEYS.some((key) => perf[key] !== null);
