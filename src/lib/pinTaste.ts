// A consumable product pin's taste profile (PinTaste, 0157, 0160): seven axes
// scored 0-5 and drawn as a radar. The first five are the ones Japanese tea and
// sake guides print (pungent and coolness were added for snacks and drinks), so
// each carries its Japanese label beside the translated one.

export const TASTE_AXES = [
  { key: 'aroma', ja: '香り' },
  { key: 'bitterness', ja: '苦味' },
  { key: 'sweetness', ja: '甘味' },
  { key: 'astringency', ja: '渋味' },
  { key: 'umami', ja: 'うま味' },
  { key: 'pungent', ja: '辛味' },
  { key: 'coolness', ja: '清涼感' },
] as const;

export type TasteAxis = (typeof TASTE_AXES)[number]['key'];
export const TASTE_KEYS = TASTE_AXES.map((axis) => axis.key) as TasteAxis[];

export const TASTE_MAX = 5;
// The score from which a product counts as tasting of an axis: what taste:<axis>
// searches for.
export const TASTE_STRONG = 3;
export const TASTE_SOURCES = ['session', 'hand'] as const;
export type TasteSource = (typeof TASTE_SOURCES)[number];

export type TasteScores = Record<TasteAxis, number>;

// A page that describes how the product tastes, with a short extract.
export type TasteReview = { url: string; title: string | null; publishedDate: string | null; quote: string | null };
export const MAX_TASTE_REVIEWS = 6;

export type PinTasteJson = TasteScores & {
  // Alcohol by volume in percent, from a figure the source states; null when
  // none is published for this product (or it is not a drink).
  abv: number | null;
  // The page that states it, when that is not the pin's own sourceUrl.
  abvSourceUrl: string | null;
  // Independent tasting reviews the scores were read from, best first.
  reviews: TasteReview[];
  source: TasteSource;
  basis: string | null;
  sourceUrl: string | null;
  checkedAt: string;
};

// A score is 0-5 in half steps; anything else is a typing mistake.
export const isTasteScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= TASTE_MAX && Number.isInteger(value * 2);

// An ABV is a percentage with at most two decimals (10.25).
export const isAbv = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 && Number.isInteger(Math.round(value * 100)) && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const hasTaste = (taste: TasteScores | null | undefined): boolean => !!taste && TASTE_KEYS.every((key) => isTasteScore(taste[key]));
