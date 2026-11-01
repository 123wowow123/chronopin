import { describe, expect, it } from 'vitest';
import { impliedReturn, ratioForReturn, ratioSpan, type Iv15Point } from './iv15Map';

const p = (over: Partial<Iv15Point>): Iv15Point => ({ symbol: 'X', name: 'X', tier: 'Stone', price: null, iv15Low: null, iv15High: null, score: null, held: false, asOf: '2026-01-01', sourceUrl: 'https://example.com', note: null, ...over });

describe('ratioSpan', () => {
  it('divides price by IV15, and a range of IV15 gives a span', () => {
    expect(ratioSpan(p({ price: 134.9, iv15Low: 91.38 }))!.high).toBeCloseTo(1.476, 2);
    const bbw = ratioSpan(p({ price: 25, iv15Low: 23, iv15High: 32 }))!;
    expect(bbw.low).toBeCloseTo(0.78, 2);
    expect(bbw.high).toBeCloseTo(1.087, 2);
  });
  it('falls back to a printed ratio, else null', () => {
    expect(ratioSpan(p({ ratio: 2.38 }))).toEqual({ low: 2.38, high: 2.38 });
    expect(ratioSpan(p({}))).toBeNull();
  });
});

describe('implied return', () => {
  it('is 15% at 1x and falls as the ratio rises', () => {
    expect(impliedReturn(1)).toBeCloseTo(0.15);
    expect(impliedReturn(2)).toBeLessThan(0.15);
    expect(impliedReturn(0.5)).toBeGreaterThan(0.15);
  });
  it('round-trips with the ratio for a return', () => {
    expect(impliedReturn(ratioForReturn(0.1))).toBeCloseTo(0.1);
  });
});
