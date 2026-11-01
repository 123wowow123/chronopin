import { describe, expect, it } from 'vitest';
import { earningsPath, hurdlePrice, sustainableGrowth } from './hurdlePrice';

describe('earningsPath', () => {
  it('grows at stage one for years 1-5, fades across 6-10, then holds the terminal rate', () => {
    const p = earningsPath(1, 0.1, 0.03);
    expect(p).toHaveLength(15);
    expect(p[1] / p[0]).toBeCloseTo(1.1);
    expect(p[4] / p[3]).toBeCloseTo(1.1);
    expect(p[10] / p[9]).toBeCloseTo(1.03);
    expect(p[14] / p[13]).toBeCloseTo(1.03);
    expect(p[6] / p[5]).toBeLessThan(1.1);
    expect(p[6] / p[5]).toBeGreaterThan(1.03);
  });
});

describe('sustainableGrowth', () => {
  it('holds revenue growth under ROIC and the ceiling, and at zero or more', () => {
    expect(sustainableGrowth(0.4, 0.12)).toBeCloseTo(0.12);
    expect(sustainableGrowth(0.4, 0.6)).toBeCloseTo(0.25);
    expect(sustainableGrowth(-0.05, 0.2)).toBe(0);
    expect(sustainableGrowth(null, null)).toBeCloseTo(0.03);
  });
});

describe('hurdlePrice', () => {
  it('returns null for a loss, no shares, or unusable cash', () => {
    expect(hurdlePrice({ ownersEarnings: -1, shares: 1, netCash: 0, growth: 0.05 })).toBeNull();
    expect(hurdlePrice({ ownersEarnings: 100, shares: 0, netCash: 0, growth: 0.05 })).toBeNull();
    expect(hurdlePrice({ ownersEarnings: 100, shares: 1, netCash: NaN, growth: 0.05 })).toBeNull();
  });
  it('with no growth the dividend model is OE per share over (15% - 3%) once the stream is in', () => {
    const r = hurdlePrice({ ownersEarnings: 100, shares: 10, netCash: 0, growth: 0.03, blend: 1 })!;
    // A flat-3% stream at 15% is a growing perpetuity: OE1 / (0.15 - 0.03).
    expect(r.price).toBeCloseTo(10 / 0.12, 3);
  });
  it('adds net cash per share and rises with growth', () => {
    const base = hurdlePrice({ ownersEarnings: 100, shares: 10, netCash: 0, growth: 0.05 })!;
    expect(hurdlePrice({ ownersEarnings: 100, shares: 10, netCash: 50, growth: 0.05 })!.price).toBeCloseTo(base.price + 5, 6);
    expect(hurdlePrice({ ownersEarnings: 100, shares: 10, netCash: 0, growth: 0.15 })!.price).toBeGreaterThan(base.price);
  });
  it('blends the two end points', () => {
    const r = hurdlePrice({ ownersEarnings: 100, shares: 10, netCash: 0, growth: 0.08 })!;
    expect(r.price).toBeCloseTo((r.dividendModel + r.exitModel) / 2, 6);
  });
});
