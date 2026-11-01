import { describe, expect, it } from 'vitest';
import type { Holding } from './holdings';
import { placeHoldings, ratioToHigh, worthFetching } from './holdingsMap';

const h = (over: Partial<Holding>): Holding => ({
  symbol: 'ZTS', name: 'Zoetis', weightPercent: 10, shares: null, side: 'long', currency: 'USD',
  costBasis: null, marketValue: null, valuationDate: null, costSourceUrl: null, valueSourceUrl: null, ...over,
});

describe('ratioToHigh', () => {
  it('is the last close over the highest high of the last year', () => {
    expect(ratioToHigh([{ close: 100, high: 120 }, { close: 60 }])).toBeCloseTo(0.5);
  });
  it('is null with no history and capped at 1', () => {
    expect(ratioToHigh([])).toBeNull();
    expect(ratioToHigh([{ close: 10, high: 9 }])).toBe(1);
  });
});

describe('placeHoldings', () => {
  it('places weighted, priced positions largest first and says why the rest are not placed', () => {
    const { placed, unplaced } = placeHoldings([
      { holding: h({ symbol: 'A', weightPercent: 5 }), ratio: 0.8 },
      { holding: h({ symbol: 'B', weightPercent: 9 }), ratio: 0.4 },
      { holding: h({ symbol: 'C', weightPercent: null }), ratio: 0.7 },
      { holding: h({ symbol: 'D' }), ratio: null },
      { holding: h({ symbol: '60855R100', identifierType: 'cusip' }), ratio: null },
    ]);
    expect(placed.map(p => p.symbol)).toEqual(['B', 'A']);
    expect(unplaced.map(u => [u.symbol, u.reason])).toEqual([['C', 'weight'], ['D', 'quote'], ['60855R100', 'identifier']]);
  });
  it('only fetches tickers that have a weight', () => {
    expect(worthFetching(h({}))).toBe(true);
    expect(worthFetching(h({ weightPercent: null }))).toBe(false);
    expect(worthFetching(h({ identifierType: 'cusip' }))).toBe(false);
  });
});
