import { TIERS, type Tier } from '@/lib/iv15Map';

// Chronopin's own tier and score for a stock that has no published rating. It
// reuses the five tier names (Fortress to Wood, the vocabulary of AI competitive
// threat) but assigns them by rule from SEC filings, so any US filer can be
// placed; the published ratings stay the analyst's and are never overwritten.
// C-IV15 © 2026 Chronopin. The thresholds are Chronopin's choices, stated here.
export const MOAT = { roic: 0.15, grossMargin: 0.5, rdIntensity: 0.08, noRd: 0.02 } as const;
// Weights of the score's three buckets: earnings quality, business quality, price against C-IV15.
export const SCORE_WEIGHTS = { shareholder: 0.25, quality: 0.4, valuation: 0.35 } as const;

// Industries whose product AI can replace or whose seats it can cut: software
// and IT services, business and payment services, advertising, consulting and
// staffing, publishing. Every other industry is treated as low exposure.
const HIGH_EXPOSURE_SIC: [number, number][] = [[7310, 7399], [7370, 7379], [8700, 8749], [2711, 2741], [6199, 6199], [4822, 4899]];
export function aiExposure(sic: number | null): 'high' | 'low' | null {
  if (sic == null) return null;
  return HIGH_EXPOSURE_SIC.some(([from, to]) => sic >= from && sic <= to) ? 'high' : 'low';
}

export type TierInput = {
  sic: number | null;
  roic: number | null;
  grossMargin: number | null;
  rdIntensity: number | null;
  // Owners' earnings are positive with the full cost of stock pay charged.
  profitableAfterStockPay: boolean;
};

// Moat points, 0-4: capital earns a high return, pricing power (gross margin),
// real R&D spend (an owned effort, as against borrowed technology), and profit
// that survives the full stock-pay charge.
export function moatPoints(i: TierInput): number {
  return (i.roic != null && i.roic >= MOAT.roic ? 1 : 0)
    + (i.grossMargin != null && i.grossMargin >= MOAT.grossMargin ? 1 : 0)
    + (i.rdIntensity != null && i.rdIntensity >= MOAT.rdIntensity ? 1 : 0)
    + (i.profitableAfterStockPay ? 1 : 0);
}

// null (Unrated) when the industry is unknown or no moat figure could be read.
export function cTier(i: TierInput): Tier | null {
  const exposure = aiExposure(i.sic);
  if (!exposure || (i.roic == null && i.grossMargin == null && i.rdIntensity == null)) return null;
  const points = moatPoints(i);
  if (exposure === 'low') return points >= 3 ? 'Fortress' : points >= 1 ? 'Castle' : 'Stone';
  // Exposed to AI: no R&D at all means the technology is borrowed.
  if (i.rdIntensity != null && i.rdIntensity < MOAT.noRd) return 'Wood';
  return points >= 4 ? 'Castle' : points === 3 ? 'Chapel' : 'Stone';
}

const TIER_POINTS: Record<Tier, number> = { Fortress: 100, Castle: 80, Chapel: 60, Stone: 40, Wood: 20 };
const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

// 0-100: earnings quality (how much net income is left after the stock-pay
// charge), business quality (tier, gross margin, ROIC) and price against C-IV15
// (100 at 0.5x or less, 0 at 4x or more, on a log scale).
export function cScore(i: { ownersEarnings: number; netIncome: number | null; tier: Tier | null; grossMargin: number | null; roic: number | null; ratio: number }): number {
  const shareholder = i.netIncome != null && i.netIncome > 0 ? clamp((i.ownersEarnings / i.netIncome) * 100) : 0;
  const quality = mean([
    ...(i.tier ? [TIER_POINTS[i.tier]] : []),
    ...(i.grossMargin != null ? [clamp(i.grossMargin * 100)] : []),
    ...(i.roic != null ? [clamp((i.roic / 0.3) * 100)] : []),
  ]);
  const valuation = clamp((100 * (Math.log(4) - Math.log(i.ratio))) / (Math.log(4) - Math.log(0.5)));
  const w = SCORE_WEIGHTS;
  return Math.round((w.shareholder * shareholder + w.quality * quality + w.valuation * valuation) * 10) / 10;
}

export { TIERS };
