// An AI video model version pin's rubric (PinVideoPerf, 0210): six axes scored
// 0-5 in half steps from the version's published specs and reviews, the sibling of the car
// rubrics (src/lib/pinGasCarPerf.ts). Anchors: docs/okf/scraping/strategy.md
// ("Video model rubric"). An axis is null when the spec is not published for the
// version.

import type { PinReview } from './pinReviews';

export const VIDEO_PERF_RUBRIC_YEAR = 2026;

export const VIDEO_PERF_AXES = [
  { key: 'resolution', label: 'Resolution' },
  { key: 'duration', label: 'Clip length' },
  { key: 'audio', label: 'Native audio' },
  { key: 'control', label: 'Reference control' },
  { key: 'speed', label: 'Speed' },
  { key: 'realism', label: 'Realism' },
] as const;

export type VideoPerfAxis = (typeof VIDEO_PERF_AXES)[number]['key'];
export const VIDEO_PERF_KEYS = VIDEO_PERF_AXES.map((axis) => axis.key) as VideoPerfAxis[];
export const VIDEO_PERF_MAX = 5;
export const VIDEO_PERF_SOURCES = ['session', 'hand'] as const;
export type VideoPerfSource = (typeof VIDEO_PERF_SOURCES)[number];
export type VideoPerfScores = Record<VideoPerfAxis, number | null>;
export const MAX_VIDEO_PERF_REVIEWS = 6;
export const MAX_VIDEO_PERF_REVIEW_QUOTE = 300;

export type PinVideoPerfJson = VideoPerfScores & {
  reviews: PinReview[];
  source: VideoPerfSource;
  basis: string | null;
  sourceUrl: string | null;
  rubricYear: number;
  checkedAt: string;
};

export const isVideoPerfScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= VIDEO_PERF_MAX && Number.isInteger(value * 2);

export const hasVideoPerf = (perf: Partial<Record<VideoPerfAxis, unknown>> | null | undefined): boolean =>
  !!perf && VIDEO_PERF_KEYS.every((key) => perf[key] === null || isVideoPerfScore(perf[key])) && VIDEO_PERF_KEYS.some((key) => perf[key] !== null);
