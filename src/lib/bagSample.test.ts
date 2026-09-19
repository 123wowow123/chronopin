import { describe, expect, it } from 'vitest';
import { bagWeight, sampleBag } from './bagSample';

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
});
