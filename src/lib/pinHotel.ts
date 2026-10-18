// A hotel or resort pin's hotel rubric (PinHotel, 0174): six axes scored 0-5 in
// half steps from the property's published guest sub-scores, critic
// recognition and independent reviews, drawn as a radar - the sibling of the
// dining radar (src/lib/pinDining.ts). The anchors for each score are the
// rubric in docs/okf/scraping/strategy.md ("Hotel rubric").
//
// An axis is null when no figure for it is published for the property (a new
// hotel has no guest scores yet): the radar draws it as "n/a" and leaves it
// out of the shape, never as a zero.

import type { PinReview } from './pinReviews';

export const HOTEL_AXES = [
  { key: 'rooms' },
  { key: 'service' },
  { key: 'location' },
  { key: 'cleanliness' },
  { key: 'value' },
  { key: 'acclaim' },
] as const;

export type HotelAxis = (typeof HOTEL_AXES)[number]['key'];
export const HOTEL_KEYS = HOTEL_AXES.map((axis) => axis.key) as HotelAxis[];

export const HOTEL_MAX = 5;
// The score from which a property counts as strong on an axis: what
// hotel:<axis> searches for.
export const HOTEL_STRONG = 3;
export const HOTEL_SOURCES = ['session', 'hand'] as const;
export type HotelSource = (typeof HOTEL_SOURCES)[number];

// null: no figure for this axis is published for the property.
export type HotelScores = Record<HotelAxis, number | null>;

// A page that reviews this property (a critic's or guest's write-up, not the
// opening announcement), with a short extract.
export type HotelReview = PinReview;
export const MAX_HOTEL_REVIEWS = 6;
export const MAX_HOTEL_REVIEW_QUOTE = 300;

export type PinHotelJson = HotelScores & {
  reviews: HotelReview[];
  source: HotelSource;
  basis: string | null;
  sourceUrl: string | null;
  checkedAt: string;
};

// A score is 0-5 in half steps; anything else is a typing mistake.
export const isHotelScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= HOTEL_MAX && Number.isInteger(value * 2);

// A rubric needs every axis to be a score or an explicit null, and at least
// one score: a profile of nothing but "n/a" says nothing.
export const hasHotel = (hotel: Partial<Record<HotelAxis, unknown>> | null | undefined): boolean =>
  !!hotel && HOTEL_KEYS.every((key) => hotel[key] === null || isHotelScore(hotel[key])) && HOTEL_KEYS.some((key) => hotel[key] !== null);
