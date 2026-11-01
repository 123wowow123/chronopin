// A published "P / IV15" map: price over the analyst's own intrinsic value that
// would pay 15% a year for 15+ years. Every number is the analyst's, copied
// from a dated post with its link; nothing is computed here except the ratio
// (when only a price and an IV15 are given) and the return a ratio implies.
export const TIERS = ['Fortress', 'Castle', 'Chapel', 'Stone', 'Wood'] as const;
export type Tier = (typeof TIERS)[number];

// A held position with no published tier, drawn from Chronopin's own estimate.
export const UNRATED = 'Unrated';
export type Iv15Point = {
  symbol: string;
  name: string;
  tier: Tier | typeof UNRATED;
  // True when iv15Low is Chronopin's 15%-hurdle price, not the analyst's IV15.
  estimate?: boolean;
  price: number | null;
  iv15Low: number | null;
  iv15High: number | null;
  ratio?: number;
  score: number | null;
  held: boolean;
  asOf: string;
  sourceUrl: string;
  note: string | null;
};

export const TIER_COLORS: Record<Tier | typeof UNRATED, string> = { Fortress: '#3b82f6', Castle: '#22c55e', Chapel: '#eab308', Stone: '#94a3b8', Wood: '#f97316', Unrated: '#a78bfa' };

// P/IV15 as a point, or a span when IV15 is a range (a higher IV15 is a lower ratio).
export function ratioSpan(p: Iv15Point): { low: number; high: number } | null {
  if (p.price != null && p.iv15Low != null) {
    const high = p.price / p.iv15Low;
    return { low: p.iv15High != null ? p.price / p.iv15High : high, high };
  }
  return p.ratio != null ? { low: p.ratio, high: p.ratio } : null;
}

const HORIZON = 15;
const TARGET = 0.15;

// Annual return at a P/IV15, if the stock is worth IV15 grown at 15% a year
// 15 years out: 1.15 * ratio^(-1/15) - 1. A ratio of 1 gives 15%.
export const impliedReturn = (ratio: number) => (1 + TARGET) * ratio ** (-1 / HORIZON) - 1;
// The ratio that gives a required return: (1.15 / (1 + r))^15.
export const ratioForReturn = (rate: number) => ((1 + TARGET) / (1 + rate)) ** HORIZON;

export const RETURN_LINES = [0.08, 0.1, 0.12, 0.15, 0.18] as const;
export const AXIS_MIN = 0.5;
export const AXIS_MAX = 10;
