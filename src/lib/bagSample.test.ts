import { describe, expect, it } from 'vitest';
import { bagWeight, confidenceWeight, sampleBag, threadWeight, volumeWeight } from './bagSample';

const pins = (n: number, views: (id: number) => number = () => 0) => Array.from({ length: n }, (_, i) => ({ id: i + 1, viewCount: views(i + 1) }));

describe('sampleBag', () => {
  it('keeps every pin when there is room', () => {
    expect(sampleBag(pins(3), 4, 's').sort()).toEqual([1, 2, 3]);
  });

  it('picks the same cards for the same seed, others for another', () => {
    const all = pins(20);
    expect(sampleBag(all, 4, '2026-09-18:2026-09-20')).toEqual(sampleBag([...all].reverse(), 4, '2026-09-18:2026-09-20'));
    const seeds = ['a', 'b', 'c', 'd', 'e'].map((s) => sampleBag(all, 4, s).join());
    expect(new Set(seeds).size).toBeGreaterThan(1);
  });

  it('displaces at most one card when a pin is added', () => {
    const before = sampleBag(pins(10), 4, 'x');
    const after = sampleBag(pins(11), 4, 'x');
    expect(after.filter((id) => !before.includes(id)).length).toBeLessThanOrEqual(1);
  });

  it('favours the more viewed pins', () => {
    const all = pins(10, (id) => (id === 7 ? 500 : 0));
    const hits = Array.from({ length: 200 }, (_, i) => sampleBag(all, 2, `seed${i}`)).filter((ids) => ids.includes(7)).length;
    expect(hits).toBeGreaterThan(190);
  });

  it('always picks the kept pin, first', () => {
    for (const seed of ['a', 'b', 'c']) {
      expect(sampleBag(pins(12), 4, seed, 9)[0]).toBe(9);
    }
  });

  it('makes room for the pins seen least, over ones passed over', () => {
    const all = pins(10, () => 0).map((p) => ({ ...p, impressionCount: p.id === 3 ? 0 : 200 }));
    const hits = Array.from({ length: 200 }, (_, i) => sampleBag(all, 2, `seed${i}`)).filter((ids) => ids.includes(3)).length;
    expect(hits).toBeGreaterThan(190);
  });
});

describe('volumeWeight', () => {
  it('ignores a pin with no market, and a market barely traded', () => {
    expect(volumeWeight(undefined)).toBe(1);
    expect(volumeWeight(null)).toBe(1);
    expect(volumeWeight(0)).toBe(1);
    expect(volumeWeight(9_000)).toBe(1);
  });

  it('counts half again for every tenfold, up to a cap', () => {
    expect(volumeWeight(100_000)).toBeCloseTo(1.5);
    expect(volumeWeight(1_000_000)).toBeCloseTo(2);
    expect(volumeWeight(10_000_000)).toBeCloseTo(2.5);
    expect(volumeWeight(500_000_000)).toBe(2.5);
  });
});

describe('bagWeight', () => {
  it('starts a new pin at the prior', () => {
    expect(bagWeight({ id: 1 })).toBeCloseTo(0.1);
  });

  it('ranks opens and watches per time seen, watches above opens', () => {
    const seen = { id: 1, impressionCount: 100 };
    expect(bagWeight({ ...seen, viewCount: 30 })).toBeGreaterThan(bagWeight({ ...seen, viewCount: 5 }));
    expect(bagWeight({ ...seen, favoriteCount: 5 })).toBeGreaterThan(bagWeight({ ...seen, viewCount: 5 }));
    expect(bagWeight({ ...seen, viewCount: 1 })).toBeLessThan(bagWeight({ id: 2 }));
  });

  it('lifts a pin for the money on the markets it cites', () => {
    const seen = { id: 1, impressionCount: 100, viewCount: 5 };
    expect(bagWeight({ ...seen, marketVolume: 1_000_000 })).toBeCloseTo(bagWeight(seen) * 2);
    expect(bagWeight({ ...seen, marketVolume: 1_000 })).toBe(bagWeight(seen));
  });
});

describe('confidenceWeight', () => {
  it('draws the curve across the band the timeline shows', () => {
    // TIMELINE_MIN_CONFIDENCE is the threshold, so it is the neutral point.
    expect(confidenceWeight(70)).toBeCloseTo(1);
    expect(confidenceWeight(100)).toBeCloseTo(1.6);
    expect(confidenceWeight(85)).toBeCloseTo(1.3);
  });

  it('keeps falling below the threshold, to a floor', () => {
    expect(confidenceWeight(55)).toBeCloseTo(0.7);
    expect(confidenceWeight(20)).toBeCloseTo(0.5);
    expect(confidenceWeight(0)).toBeCloseTo(0.5);
  });

  it('leaves an unscored pin alone', () => {
    expect(confidenceWeight(undefined)).toBe(1);
    expect(confidenceWeight(null)).toBe(1);
    expect(confidenceWeight(NaN)).toBe(1);
  });
});

describe('threadWeight', () => {
  it("counts the chain at a third of the pin's own evidence", () => {
    expect(threadWeight(100)).toBeCloseTo(1.2);
    expect(threadWeight(70)).toBeCloseTo(1);
    expect(threadWeight(100)).toBeLessThan(confidenceWeight(100));
  });

  it('is neutral for a pin in no thread', () => {
    expect(threadWeight(null)).toBe(1);
    expect(threadWeight(undefined)).toBe(1);
  });
});

describe('bagWeight with evidence', () => {
  const seen = { id: 1, impressionCount: 100, viewCount: 5 };
  // One reference at a given confidence, dated so recency does not enter.
  const backed = (confidence: number) => ({ references: [{ url: 'https://example.com/a', confidence, publishedDate: '2026-01-01' }] });

  it('weighs a well-sourced pin above a thinly sourced one', () => {
    expect(bagWeight({ ...seen, ...backed(95) })).toBeGreaterThan(bagWeight({ ...seen, ...backed(72) }));
    expect(bagWeight({ ...seen, ...backed(100) })).toBeCloseTo(bagWeight(seen) * 1.6);
  });

  it("adds the thread on top of the pin's own confidence", () => {
    const alone = bagWeight({ ...seen, ...backed(100) });
    const inChain = bagWeight({ ...seen, ...backed(100), threadConfidence: 100 });
    expect(inChain).toBeCloseTo(alone * 1.2);
    expect(bagWeight({ ...seen, ...backed(100), threadConfidence: 70 })).toBeCloseTo(alone);
  });

  it('leaves a pin with no references where it was', () => {
    expect(bagWeight({ ...seen, references: [] })).toBe(bagWeight(seen));
  });
});

describe('sampleBag with confidence', () => {
  it('favours the better-evidenced pin, all else equal', () => {
    const backed = (confidence: number) => [{ url: 'https://example.com/a', confidence, publishedDate: '2026-01-01' }];
    const all = pins(10).map((p) => ({ ...p, references: backed(p.id === 4 ? 100 : 70) }));
    const hits = Array.from({ length: 200 }, (_, i) => sampleBag(all, 2, `seed${i}`)).filter((ids) => ids.includes(4)).length;
    expect(hits).toBeGreaterThan(40);
  });
});

describe('sampleBag with market volume', () => {
  it('favours the pin whose markets are busiest, all else equal', () => {
    const all = pins(10).map((p) => ({ ...p, marketVolume: p.id === 4 ? 50_000_000 : 0 }));
    const hits = Array.from({ length: 200 }, (_, i) => sampleBag(all, 2, `seed${i}`)).filter((ids) => ids.includes(4)).length;
    expect(hits).toBeGreaterThan(80);
  });
});
