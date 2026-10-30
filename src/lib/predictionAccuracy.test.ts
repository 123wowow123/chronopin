import { describe, expect, it } from 'vitest';
import { calibration, favoriteWon, forecastLabels, scoreMarket, settlement, summarize } from './predictionAccuracy';

describe('forecastLabels', () => {
  it('scores a yes/no question once, by its leading side', () => {
    expect(forecastLabels([{ label: 'No', probability: 0.3 }, { label: 'Yes', probability: 0.7 }])).toEqual([{ label: 'Yes', probability: 0.7 }]);
  });
  it('scores every priced outcome of a bigger market', () => {
    const out = forecastLabels([{ label: 'A', probability: 0.5 }, { label: 'B', probability: 0.3 }, { label: 'C', probability: null }, { label: 'D', probability: 0.2 }]);
    expect(out.map((o) => o.label)).toEqual(['A', 'B', 'D']);
  });
});

describe('settlement', () => {
  it('is resolved when an outcome settled yes', () => {
    expect(settlement([{ label: 'Yes', probability: 1 }, { label: 'No', probability: 0 }])).toBe('resolved');
  });
  it('is void when the market closed at 50-50', () => {
    expect(settlement([{ label: 'Yes', probability: 0.5 }, { label: 'No', probability: 0.5 }])).toBe('void');
  });
});

describe('scoreMarket', () => {
  it('marks the winning and losing outcomes and skips the undecided', () => {
    const forecasts = scoreMarket(
      [{ label: 'A', probability: 0.6 }, { label: 'B', probability: 0.3 }, { label: 'C', probability: 0.1 }],
      [{ label: 'A', probability: 0 }, { label: 'B', probability: 1 }, { label: 'C', probability: 0.5 }],
    );
    expect(forecasts).toEqual([{ label: 'A', probability: 0.6, won: false }, { label: 'B', probability: 0.3, won: true }]);
  });
});

describe('favoriteWon', () => {
  it('reads the leading outcome', () => {
    const odds = [{ label: 'Yes', probability: 0.8 }, { label: 'No', probability: 0.2 }];
    expect(favoriteWon(odds, [{ label: 'Yes', probability: 1 }, { label: 'No', probability: 0 }])).toBe(true);
    expect(favoriteWon(odds, [{ label: 'Yes', probability: 0 }, { label: 'No', probability: 1 }])).toBe(false);
    expect(favoriteWon(odds, [{ label: 'Yes', probability: 0.5 }])).toBeNull();
  });
});

describe('calibration and summary', () => {
  it('buckets forecasts by chance, putting 100% in the top bucket', () => {
    const buckets = calibration([{ label: 'a', probability: 1, won: true }, { label: 'b', probability: 0.85, won: false }, { label: 'c', probability: 0.1, won: false }]);
    expect(buckets.map((b) => [b.from, b.count, b.hitRate])).toEqual([[0, 1, 0], [0.8, 2, 0.5]]);
  });
  it('computes the Brier score and favorite hit rate', () => {
    const s = summarize([
      { forecasts: [{ label: 'Yes', probability: 0.8, won: true }], favoriteWon: true },
      { forecasts: [{ label: 'Yes', probability: 0.6, won: false }], favoriteWon: false },
    ]);
    expect(s.markets).toBe(2);
    expect(s.brier).toBeCloseTo((0.04 + 0.36) / 2);
    expect(s.favoriteHitRate).toBe(0.5);
  });
  it('is empty with no markets', () => {
    const s = summarize([]);
    expect(s.brier).toBeNull();
    expect(s.favoriteHitRate).toBeNull();
  });
});
