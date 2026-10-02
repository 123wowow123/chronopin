import { describe, expect, it } from 'vitest';
import {
  adAllowed,
  ageOn,
  type AdCandidate,
  type AdContext,
  parseAmazonTags,
  performanceWeight,
  personalWeight,
  pickAds,
  regionFromAcceptLanguage,
  relatedness,
  rewardWeight,
  servingStore,
  taggedAdUrl,
} from './ads';

const ad = (over: Partial<AdCandidate>): AdCandidate => ({
  key: 'ad:1',
  kind: 'special',
  program: 'prime',
  url: 'https://www.amazon.com/amazonprime',
  store: 'US',
  categories: [],
  company: null,
  weight: 1,
  rewardUsd: null,
  minAge: 18,
  targetAgeFrom: null,
  targetAgeTo: null,
  pinId: null,
  title: null,
  price: null,
  thumbName: null,
  originalUrl: null,
  ...over,
});
const none: AdContext = { preference: null, age: null, pin: null };

// A fixed sequence, so a weighted pick is repeatable.
function seeded(seed = 1) {
  let x = seed;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
}

describe('ageOn', () => {
  it('counts whole years to the birthday', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    expect(ageOn('2008-10-01', now)).toBe(18);
    expect(ageOn('2008-10-02', now)).toBe(17);
    expect(ageOn(null, now)).toBeNull();
    expect(ageOn('nonsense', now)).toBeNull();
  });
});

describe('adAllowed', () => {
  it('keeps sign-up programs from under-18s, everything from under-13s', () => {
    const product = ad({ key: 'm:1', kind: 'product', program: null, minAge: 0 });
    expect(adAllowed(ad({}), { ...none, age: 16 })).toBe(false);
    expect(adAllowed(product, { ...none, age: 16 })).toBe(true);
    expect(adAllowed(product, { ...none, age: 12 })).toBe(false);
    expect(adAllowed(ad({}), none)).toBe(true);
  });

  it("leaves out the pin's own product on its page", () => {
    const pin = { id: 7, categories: [], tags: [], company: null };
    expect(adAllowed(ad({ kind: 'product', pinId: 7 }), { ...none, pin })).toBe(false);
  });
});

describe('weights', () => {
  it('weighs categories the viewer leans to, and ages in range', () => {
    const preference = { clicked: [], categories: [{ name: 'Movie', share: 0.5 }], companies: [], signals: 4 };
    const video = ad({ categories: ['Movie'], targetAgeFrom: 18, targetAgeTo: 44 });
    expect(personalWeight(video, { ...none, preference })).toBe(2);
    expect(personalWeight(video, { ...none, age: 30 })).toBe(2);
    expect(personalWeight(video, { ...none, age: 60 })).toBe(1);
  });

  it('scores shared categories, tags and the same company', () => {
    const pin = { id: 1, categories: ['Gaming'], tags: ['Nintendo'], company: 'Nintendo' };
    expect(relatedness(ad({ categories: ['gaming'] }), pin)).toBe(3);
    expect(relatedness(ad({ kind: 'product', categories: ['Gaming'], company: 'Nintendo' }), pin)).toBe(7);
    expect(relatedness(ad({ categories: ['Food'] }), pin)).toBe(0);
  });

  it('nudges weight up for a richer bounty, clamped either side', () => {
    expect(rewardWeight({ rewardUsd: null })).toBe(1);
    expect(rewardWeight({ rewardUsd: 10 })).toBe(1);
    expect(rewardWeight({ rewardUsd: 40 })).toBe(1.5);
    expect(rewardWeight({ rewardUsd: 1 })).toBe(0.75);
  });

  it('shrinks a slot\'s click-through rate toward its own average', () => {
    expect(performanceWeight(undefined, 0)).toBe(1);
    // No data yet for this ad in a slot that does convert: shrunk to 1 (the
    // average), not punished for having no history.
    expect(performanceWeight(undefined, 0.02)).toBeCloseTo(1, 5);
    // A huge sample that clearly outperforms the slot's average pulls hard
    // toward the clamp; a tiny sample barely moves off 1.
    expect(performanceWeight({ impressions: 100000, clicks: 6000 }, 0.02)).toBe(2);
    expect(performanceWeight({ impressions: 5, clicks: 0 }, 0.02)).toBeCloseTo(1, 1);
  });
});

describe('pickAds', () => {
  const programs = [1, 2, 3].map((i) => ad({ key: `ad:${i}`, program: `p${i}` }));
  const products = Array.from({ length: 100 }, (_, i) => ad({ key: `m:${i}`, kind: 'product', program: null, minAge: 0, categories: i === 5 ? ['Gaming'] : [] }));

  it('never repeats and returns at most n', () => {
    const picked = pickAds([...programs, ...products], none, 4, new Set(), seeded());
    expect(picked).toHaveLength(4);
    expect(new Set(picked.map((a) => a.key)).size).toBe(4);
  });

  it('gives a pool its share however many ads it holds', () => {
    const random = seeded(7);
    let programPicks = 0;
    for (let i = 0; i < 400; i++) if (pickAds([...programs, ...products], none, 1, new Set(), random)[0].kind !== 'product') programPicks++;
    // special 4 against product 2: about two thirds, not 3 in 103.
    expect(programPicks / 400).toBeGreaterThan(0.55);
    expect(programPicks / 400).toBeLessThan(0.78);
  });

  it('puts related ads first on a pin page', () => {
    const pin = { id: 999, categories: ['Gaming'], tags: [], company: null };
    const picked = pickAds([...programs, ...products], { ...none, pin }, 2, new Set(), seeded(3));
    expect(picked[0].key).toBe('m:5');
  });

  it('uses ads already on the page only when the rest run out', () => {
    const avoid = new Set(['ad:1', 'ad:2']);
    expect(pickAds(programs, none, 1, avoid, seeded())[0].key).toBe('ad:3');
    expect(pickAds(programs, none, 3, avoid, seeded())).toHaveLength(3);
  });

  it('shows the ad that converts better in this slot more often', () => {
    const two = [ad({ key: 'ad:1', program: 'p1' }), ad({ key: 'ad:2', program: 'p2' })];
    const performance = {
      baselineCtr: 0.02,
      byKey: new Map([['ad:1', { impressions: 50000, clicks: 3000 }]]),
    };
    const random = seeded(11);
    let firstWins = 0;
    for (let i = 0; i < 400; i++) if (pickAds(two, { ...none, performance }, 1, new Set(), random)[0].key === 'ad:1') firstWins++;
    expect(firstWins / 400).toBeGreaterThan(0.6);
  });

  it('gives a richer bounty slightly more of its pool\'s share', () => {
    const two = [ad({ key: 'ad:1', program: 'p1', rewardUsd: 40 }), ad({ key: 'ad:2', program: 'p2', rewardUsd: 10 })];
    const random = seeded(13);
    let firstWins = 0;
    for (let i = 0; i < 400; i++) if (pickAds(two, none, 1, new Set(), random)[0].key === 'ad:1') firstWins++;
    // 1.5x against 1x - a clear lean, not a landslide.
    expect(firstWins / 400).toBeGreaterThan(0.52);
    expect(firstWins / 400).toBeLessThan(0.75);
  });
});

describe('stores', () => {
  it("serves a country's own store only with an id and ads for it", () => {
    expect(servingStore('GB', {}, new Set(['US', 'GB']))).toBe('US');
    expect(servingStore('GB', { GB: 'x-21' }, new Set(['US']))).toBe('US');
    expect(servingStore('GB', { GB: 'x-21' }, new Set(['US', 'GB']))).toBe('GB');
    expect(servingStore('AT', { DE: 'x-21' }, new Set(['US', 'DE']))).toBe('DE');
    expect(servingStore(null, {}, new Set(['US']))).toBe('US');
  });

  it('tags Amazon links for their store and leaves others alone', () => {
    expect(taggedAdUrl('https://www.amazon.com/haul?tag=other', 'US', {})).toBe('https://www.amazon.com/haul?tag=chronopin04-20');
    expect(taggedAdUrl('https://www.amazon.co.uk/x', 'GB', { GB: 'cp-21' })).toBe('https://www.amazon.co.uk/x?tag=cp-21');
    expect(taggedAdUrl('https://example.com/x', 'US', {})).toBe('https://example.com/x');
  });

  it('reads the region of the language and the stored ids', () => {
    expect(regionFromAcceptLanguage('en-GB,en;q=0.9')).toBe('GB');
    expect(regionFromAcceptLanguage('fr;q=0.9, de-AT')).toBe('AT');
    expect(regionFromAcceptLanguage('en')).toBeNull();
    expect(parseAmazonTags({ gb: 'cp-21', XX: 'nope', DE: 5 })).toEqual({ GB: 'cp-21' });
  });
});
