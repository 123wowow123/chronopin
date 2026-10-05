import { describe, expect, it } from 'vitest';
import {
  adAllowed,
  adTag,
  expandAvoid,
  ageOn,
  type AdCandidate,
  type AdContext,
  parseAmazonTags,
  parseUrgency,
  qualityWeight,
  performanceWeight,
  personalWeight,
  pickAds,
  regionFromAcceptLanguage,
  relatedness,
  rewardWeight,
  servingStore,
  storeForLocale,
  tagForStore,
  taggedAdUrl,
  validateAmazonTags,
  watchBrand,
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
  forPinId: null,
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

  it('returns none when none are asked for', () => {
    expect(pickAds([...programs, ...products], none, 0, new Set(), seeded())).toEqual([]);
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

describe('equal weights without rewards', () => {
  it('shows every program ad as often as another when none has a reward', () => {
    const jp = [
      ad({ key: 'ad:1', kind: 'special', program: 'prime', rewardUsd: null }),
      ad({ key: 'ad:2', kind: 'special', program: 'audible', rewardUsd: null }),
      ad({ key: 'ad:3', kind: 'bonus', program: 'fresh', rewardUsd: null }),
      ad({ key: 'ad:4', kind: 'tradein', program: 'tradein', rewardUsd: null }),
    ];
    const seen = new Map<string, number>();
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 4000; i++) {
      const [picked] = pickAds(jp, { preference: null, age: null, pin: null }, 1, new Set(), random);
      seen.set(picked.key, (seen.get(picked.key) ?? 0) + 1);
    }
    for (const count of seen.values()) expect(count / 4000).toBeGreaterThan(0.2);
    for (const count of seen.values()) expect(count / 4000).toBeLessThan(0.3);
  });

  it('keeps the kind shares once any program has a reward', () => {
    const us = [
      ad({ key: 'ad:1', kind: 'special', program: 'prime', rewardUsd: 40 }),
      ad({ key: 'ad:2', kind: 'bonus', program: 'fresh', rewardUsd: 1 }),
    ];
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let special = 0;
    for (let i = 0; i < 3000; i++) if (pickAds(us, { preference: null, age: null, pin: null }, 1, new Set(), random)[0].key === 'ad:1') special++;
    expect(special / 3000).toBeGreaterThan(0.6);
  });
});

describe('stores', () => {
  it("serves a country's own store only with an id and ads for it", () => {
    // Global Earning stores use the US id; others (Japan) need their own.
    expect(servingStore('GB', {}, new Set(['US', 'GB']))).toBe('GB');
    expect(servingStore('GB', {}, new Set(['US']))).toBe('US');
    expect(servingStore('AT', {}, new Set(['US', 'DE']))).toBe('DE');
    expect(servingStore('JP', {}, new Set(['US', 'JP']))).toBe('US');
    expect(servingStore('JP', { JP: 'x-22' }, new Set(['US']))).toBe('US');
    expect(servingStore('JP', { JP: 'x-22' }, new Set(['US', 'JP']))).toBe('JP');
    expect(servingStore(null, {}, new Set(['US']))).toBe('US');
  });

  it('gives each store its own id, the US one under Global Earning', () => {
    expect(tagForStore('US', {})).toBe('chronopin04-20');
    expect(tagForStore('DE', {})).toBe('chronopin04-20');
    expect(tagForStore('DE', { DE: 'own-21' })).toBe('own-21');
    expect(tagForStore('JP', {})).toBeNull();
    expect(tagForStore('JP', { JP: 'x-22' })).toBe('x-22');
    expect(taggedAdUrl('https://www.amazon.de/prime', 'DE', {})).toBe('https://www.amazon.de/prime?tag=chronopin04-20');
  });

  it('guesses a store from the page language only where one store fits', () => {
    expect(storeForLocale('ja')).toBe('JP');
    expect(storeForLocale('pt')).toBe('BR');
    expect(storeForLocale('ar')).toBeNull();
    expect(storeForLocale('en')).toBeNull();
    expect(servingStore(storeForLocale('ja'), { JP: 'x-22' }, new Set(['US', 'JP']))).toBe('JP');
    expect(servingStore(storeForLocale('de'), {}, new Set(['US', 'DE']))).toBe('DE');
  });

  it('validates submitted store ids', () => {
    expect(validateAmazonTags({ gb: ' cp-21 ', DE: '', JP: 'chronopinawza-22' })).toEqual({ tags: { GB: 'cp-21', JP: 'chronopinawza-22' } });
    for (const bad of [null, [], { US: 'x-20' }, { XX: 'abc-21' }, { GB: 5 }, { GB: 'no spaces' }, { GB: 'ab' }]) {
      expect(validateAmazonTags(bad)).toHaveProperty('problem');
    }
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

describe('ads chosen for a pin', () => {
  const pin = { id: 5157, categories: ['Sports'], tags: ['Tamiya'], company: 'Tamiya' };
  const chosen = (over: Partial<AdCandidate> = {}) =>
    ad({ key: 'p:1', kind: 'product', program: null, pinId: 5157, forPinId: 5157, company: 'TAMIYA', minAge: 0, ...over });

  it('shows on its own pin, where a pin\'s own listing is hidden', () => {
    expect(adAllowed(chosen(), { ...none, pin })).toBe(true);
    expect(adAllowed(chosen({ forPinId: null }), { ...none, pin })).toBe(false);
  });

  it('ranks a brand match for the pin\'s company above one that only suits the pin', () => {
    const match = chosen({ key: 'p:1' });
    const other = chosen({ key: 'p:2', company: 'Bandai' });
    expect(relatedness(match, pin)).toBeGreaterThan(relatedness(other, pin));
    expect(relatedness(other, pin)).toBeGreaterThan(0);
  });

  it('puts the pin\'s own ads first in its slots', () => {
    const picked = pickAds([ad({ key: 'ad:1', categories: ['Sports'] }), chosen()], { ...none, pin }, 1, new Set(), seeded());
    expect(picked.map((ad) => ad.key)).toEqual(['p:1']);
  });
});

describe('no duplicate ads', () => {
  const listing = (key: string, asin: string) => ad({ key, kind: 'product', program: null, minAge: 0, url: `https://www.amazon.com/dp/${asin}` });

  it('shows a product once however many keys it has', () => {
    const picked = pickAds([listing('m:1', 'B000000001'), listing('p:1', 'B000000001'), listing('m:2', 'B000000002')], none, 3, new Set(), seeded());
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map((a) => a.url)).size).toBe(2);
  });

  it('avoids a product already on the page under another key', () => {
    const all = [listing('m:1', 'B000000001'), listing('p:1', 'B000000001'), listing('m:2', 'B000000002')];
    expect([...expandAvoid(all, new Set(['m:1']))].sort()).toEqual(['m:1', 'p:1']);
    expect(pickAds(all, none, 1, expandAvoid(all, new Set(['m:1'])), seeded()).map((a) => a.key)).toEqual(['m:2']);
  });
});

describe('parseUrgency', () => {
  it('reads stock left and lowest-price spans, and nothing else', () => {
    expect(parseUrgency('left:12')).toEqual({ kind: 'left', count: 12 });
    expect(parseUrgency('low:90')).toEqual({ kind: 'low', days: 90 });
    expect(parseUrgency('left:0')).toBeNull();
    expect(parseUrgency('sale:5')).toBeNull();
    expect(parseUrgency(null)).toBeNull();
  });
});

describe('qualityWeight', () => {
  it('is neutral without stars and at 4.3 stars from 1,000 reviews', () => {
    expect(qualityWeight({})).toBe(1);
    expect(qualityWeight({ rating: 4.3, reviewCount: 990 })).toBeCloseTo(1, 5);
  });
  it('favours high stars and many reviews, within bounds', () => {
    const good = qualityWeight({ rating: 4.8, reviewCount: 20000 });
    const middling = qualityWeight({ rating: 4.3, reviewCount: 1000 });
    const thin = qualityWeight({ rating: 4.0, reviewCount: 40 });
    expect(good).toBeGreaterThan(middling);
    expect(middling).toBeGreaterThan(thin);
    expect(qualityWeight({ rating: 5, reviewCount: 1e9 })).toBeLessThanOrEqual(2 * 1.6);
    expect(qualityWeight({ rating: 1, reviewCount: 0 })).toBeGreaterThanOrEqual(0.25);
  });
  it('weighs a better reviewed product up in pickAds', () => {
    const base: Omit<AdCandidate, 'key'> = { kind: 'product', program: null, url: '', store: 'US', categories: [], company: null, weight: 1, rewardUsd: null, minAge: 0, targetAgeFrom: null, targetAgeTo: null, pinId: null, forPinId: null, title: 't', price: 1, thumbName: null, originalUrl: null };
    const ads: AdCandidate[] = [
      { ...base, key: 'p:good', url: 'https://www.amazon.com/dp/B000000001', rating: 4.8, reviewCount: 20000 },
      { ...base, key: 'p:thin', url: 'https://www.amazon.com/dp/B000000002', rating: 4.0, reviewCount: 40 },
    ];
    const ctx: AdContext = { preference: null, age: null, pin: null };
    let good = 0;
    for (let i = 0; i < 400; i++) if (pickAds(ads, ctx, 1)[0].key === 'p:good') good++;
    expect(good).toBeGreaterThan(280);
  });
});

describe('watch ads', () => {
  const rolex = ad({ key: 'ad:90', kind: 'watch', program: 'watch_rolex', url: 'https://www.ebay.com/sch/31387/i.html?_nkw=rolex&LH_BIN=1', categories: ['Watches', 'Luxury'], title: 'Rolex' });

  it('carry the eBay campaign, not the Amazon tag', () => {
    const url = new URL(taggedAdUrl(rolex.url, 'US', {}));
    expect(url.hostname).toBe('www.ebay.com');
    expect(url.searchParams.get('campid')).toBe('5338380156');
    expect(url.searchParams.get('_nkw')).toBe('rolex');
    expect(url.searchParams.has('tag')).toBe(false);
    expect(adTag(rolex, {})).toBe('5338380156');
    expect(adTag(ad({}), {})).toBe('chronopin04-20');
  });

  it('name their brand', () => {
    expect(watchBrand('watch_ap')).toBe('Audemars Piguet');
    expect(watchBrand('prime')).toBeNull();
  });

  it('lead a Watches pin and stay a minority elsewhere', () => {
    const others = Array.from({ length: 6 }, (_, i) => ad({ key: `ad:${i}`, program: `p${i}` }));
    const pin = { id: 1, categories: ['Fashion'], tags: ['Watches', 'Rolex'], company: 'Rolex' };
    expect(pickAds([...others, rolex], { ...none, pin }, 1)[0].key).toBe('ad:90');
    let shown = 0;
    for (let i = 0; i < 600; i++) if (pickAds([...others, rolex], none, 1).some((a) => a.key === 'ad:90')) shown++;
    expect(shown).toBeLessThan(200);
  });

  it('are for adults', () => {
    expect(adAllowed({ ...rolex, minAge: 18 }, { ...none, age: 16 })).toBe(false);
    expect(adAllowed({ ...rolex, minAge: 18 }, { ...none, age: 30 })).toBe(true);
  });
});
