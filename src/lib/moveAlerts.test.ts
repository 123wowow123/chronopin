import { describe, expect, it } from 'vitest';
import { biggestMove, moveSize } from './moveAlerts';

describe('moveSize', () => {
  it('measures a market in points and a stock in percent', () => {
    expect(moveSize('market', 40, 47)).toBe(7);
    expect(moveSize('stock', 100, 94)).toBeCloseTo(-6);
  });
});

describe('biggestMove', () => {
  it('is null until something moves more than the threshold', () => {
    expect(biggestMove('market', 5, { Yes: 40, No: 60 }, { Yes: 45, No: 55 })).toBeNull();
    expect(biggestMove('stock', 5, { price: 100 }, { price: 105 })).toBeNull();
  });
  it('picks the outcome that moved furthest, up or down', () => {
    expect(biggestMove('market', 5, { A: 40, B: 30, C: 30 }, { A: 47, B: 18, C: 35 })).toEqual({ key: 'B', from: 30, to: 18 });
    expect(biggestMove('stock', 5, { price: 100 }, { price: 93 })).toEqual({ key: 'price', from: 100, to: 93 });
  });
  it('skips an outcome with no baseline yet', () => {
    expect(biggestMove('market', 5, { A: 40 }, { A: 41, New: 90 })).toBeNull();
  });
});
