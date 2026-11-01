import type { Holding } from '@/lib/holdings';

// "The All-Map" for one portfolio: every position that has a published weight
// and a live Nasdaq price, laid out on one chart. Height is the last close over
// the 52-week high (log scale), so the bottom is what has been beaten down the
// most; across is the position's weight in the portfolio, and the bubble grows
// with the weight. This is a layout of public numbers, never a valuation: no
// intrinsic value is estimated, and a position with no weight or no quote is
// listed beside the chart with the reason, never placed at a guess.
export type MapInput = { holding: Holding; ratio: number | null };
export type MapPoint = { symbol: string; name: string; side: Holding['side']; weight: number; ratio: number };
export type Unplaced = { symbol: string; name: string; reason: 'weight' | 'quote' | 'identifier' };

// Reference lines on the price axis: how far under the 52-week high.
export const RATIO_LINES = [0.9, 0.75, 0.5] as const;
export const RATIO_MIN = 0.4;
export const RATIO_TOP = 1.25;

const TRADING_DAYS = 252;

// Last close over the highest high of the last year of sessions, 0..1.
export function ratioToHigh(closes: { close: number; high?: number }[]): number | null {
  const year = closes.slice(-TRADING_DAYS);
  if (!year.length) return null;
  const last = year[year.length - 1].close;
  const high = Math.max(...year.map(c => c.high ?? c.close));
  return last > 0 && high > 0 ? Math.min(last / high, 1) : null;
}

export function placeHoldings(items: MapInput[]): { placed: MapPoint[]; unplaced: Unplaced[] } {
  const placed: MapPoint[] = [];
  const unplaced: Unplaced[] = [];
  for (const { holding: h, ratio } of items) {
    const base = { symbol: h.symbol, name: h.name };
    if (h.identifierType === 'cusip') unplaced.push({ ...base, reason: 'identifier' });
    else if (h.weightPercent == null || !(h.weightPercent > 0)) unplaced.push({ ...base, reason: 'weight' });
    else if (ratio == null) unplaced.push({ ...base, reason: 'quote' });
    else placed.push({ ...base, side: h.side, weight: h.weightPercent, ratio });
  }
  return { placed: placed.sort((a, b) => b.weight - a.weight), unplaced };
}

// A position is mappable at all only if it could be priced: a ticker with a weight.
export const worthFetching = (h: Holding) => h.identifierType !== 'cusip' && h.weightPercent != null && h.weightPercent > 0;
