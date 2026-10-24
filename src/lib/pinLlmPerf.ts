// A language model version pin's rubric (PinLlmPerf, 0210): six axes scored
// 0-5 in half steps from the version's published specs and reviews, the sibling of the car
// rubrics (src/lib/pinGasCarPerf.ts). Anchors: docs/okf/scraping/strategy.md
// ("Language model rubric"). An axis is null when the spec is not published for the
// version.

import type { PinReview } from './pinReviews';

export const LLM_PERF_RUBRIC_YEAR = 2026;

export const LLM_PERF_AXES = [
  { key: 'reasoning', label: 'Reasoning' },
  { key: 'coding', label: 'Coding' },
  { key: 'context', label: 'Context window' },
  { key: 'price', label: 'Price' },
  { key: 'speed', label: 'Speed' },
  { key: 'modalities', label: 'Modalities' },
] as const;

export type LlmPerfAxis = (typeof LLM_PERF_AXES)[number]['key'];
export const LLM_PERF_KEYS = LLM_PERF_AXES.map((axis) => axis.key) as LlmPerfAxis[];
export const LLM_PERF_MAX = 5;
export const LLM_PERF_SOURCES = ['session', 'hand'] as const;
export type LlmPerfSource = (typeof LLM_PERF_SOURCES)[number];
export type LlmPerfScores = Record<LlmPerfAxis, number | null>;
export const MAX_LLM_PERF_REVIEWS = 6;
export const MAX_LLM_PERF_REVIEW_QUOTE = 300;

export type PinLlmPerfJson = LlmPerfScores & {
  reviews: PinReview[];
  source: LlmPerfSource;
  basis: string | null;
  sourceUrl: string | null;
  rubricYear: number;
  checkedAt: string;
};

export const isLlmPerfScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= LLM_PERF_MAX && Number.isInteger(value * 2);

export const hasLlmPerf = (perf: Partial<Record<LlmPerfAxis, unknown>> | null | undefined): boolean =>
  !!perf && LLM_PERF_KEYS.every((key) => perf[key] === null || isLlmPerfScore(perf[key])) && LLM_PERF_KEYS.some((key) => perf[key] !== null);
