// An airliner variant pin's rubric (PinAircraftPerf, 0210): six axes scored
// 0-5 in half steps from the variant's published specs, the sibling of the car
// rubrics (src/lib/pinGasCarPerf.ts). Anchors: docs/okf/scraping/strategy.md
// ("Airliner rubric"). An axis is null when the spec is not published for the
// variant.

import type { PinReview } from './pinReviews';

export const AIRCRAFT_PERF_RUBRIC_YEAR = 2026;

export const AIRCRAFT_PERF_AXES = [
  { key: 'range', label: 'Range' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'efficiency', label: 'Fuel efficiency' },
  { key: 'speed', label: 'Speed' },
  { key: 'runway', label: 'Runway versatility' },
  { key: 'comfort', label: 'Passenger comfort' },
] as const;

export type AircraftPerfAxis = (typeof AIRCRAFT_PERF_AXES)[number]['key'];
export const AIRCRAFT_PERF_KEYS = AIRCRAFT_PERF_AXES.map((axis) => axis.key) as AircraftPerfAxis[];
export const AIRCRAFT_PERF_MAX = 5;
export const AIRCRAFT_PERF_SOURCES = ['session', 'hand'] as const;
export type AircraftPerfSource = (typeof AIRCRAFT_PERF_SOURCES)[number];
export type AircraftPerfScores = Record<AircraftPerfAxis, number | null>;
export const MAX_AIRCRAFT_PERF_REVIEWS = 6;
export const MAX_AIRCRAFT_PERF_REVIEW_QUOTE = 300;

export type PinAircraftPerfJson = AircraftPerfScores & {
  reviews: PinReview[];
  source: AircraftPerfSource;
  basis: string | null;
  sourceUrl: string | null;
  rubricYear: number;
  checkedAt: string;
};

export const isAircraftPerfScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= AIRCRAFT_PERF_MAX && Number.isInteger(value * 2);

export const hasAircraftPerf = (perf: Partial<Record<AircraftPerfAxis, unknown>> | null | undefined): boolean =>
  !!perf && AIRCRAFT_PERF_KEYS.every((key) => perf[key] === null || isAircraftPerfScore(perf[key])) && AIRCRAFT_PERF_KEYS.some((key) => perf[key] !== null);
