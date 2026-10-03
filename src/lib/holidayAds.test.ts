import { describe, expect, it } from 'vitest';
import { holidayWeight, pickAds, pickHolidayAds, type AdCandidate, type AdContext } from './ads';
import type { AdTier } from './culturalDays';

const ad = (id: number, holiday: string, tier: AdTier, over: Partial<AdCandidate> = {}): AdCandidate => ({
  key: `h:${id}`,
  kind: 'product',
  program: null,
  url: `https://www.amazon.com/dp/B0000000${String(id).padStart(2, '0')}`,
  store: 'US',
  categories: [],
  company: 'Brand',
  weight: 1,
  rewardUsd: null,
  minAge: 0,
  targetAgeFrom: null,
  targetAgeTo: null,
  pinId: null,
  forPinId: null,
  title: `Product ${id}`,
  price: 10 * id,
  thumbName: null,
  originalUrl: null,
  holiday,
  tier,
  imageUrl: 'https://m.media-amazon.com/images/I/x._AC_SL300_.jpg',
  ...over,
});
const none: AdContext = { preference: null, age: null, pin: null };

function seeded(seed = 1) {
  let x = seed;
  return () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
}

const mooncakes = [ad(1, 'mid-autumn', 'value'), ad(2, 'mid-autumn', 'value'), ad(3, 'mid-autumn', 'mid'), ad(4, 'mid-autumn', 'premium')];
const active = [{ id: 'mid-autumn', offset: 8 }];

describe('pickHolidayAds', () => {
  it('shows an inexpensive, a middle and an expensive choice together, cheapest first', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const picked = pickHolidayAds(mooncakes, none, active, 3, null, new Set(), seeded(seed));
      expect(picked.map((a) => a.tier)).toEqual(['value', 'mid', 'premium']);
    }
  });

  it('is empty outside the holiday window and for holidays with no ads', () => {
    expect(pickHolidayAds(mooncakes, none, [], 3)).toEqual([]);
    expect(pickHolidayAds(mooncakes, none, [{ id: 'halloween', offset: 0 }], 3)).toEqual([]);
    expect(pickHolidayAds(mooncakes, none, active, 0)).toEqual([]);
  });

  it('shows different tiers when the slot is narrower than three', () => {
    const picked = pickHolidayAds(mooncakes, none, active, 2, null, new Set(), seeded(3));
    expect(new Set(picked.map((a) => a.tier)).size).toBe(2);
  });

  it('repeats a tier a holiday has two of when another tier is missing', () => {
    const picked = pickHolidayAds([ad(1, 'mid-autumn', 'value'), ad(2, 'mid-autumn', 'value'), ad(3, 'mid-autumn', 'premium')].slice(0, 3), none, active, 3, null, new Set(), seeded(5));
    expect(picked).toHaveLength(3);
    expect(new Set(picked.map((a) => a.key)).size).toBe(3);
  });

  it('keeps to the holidays a pin falls on', () => {
    const both = [...mooncakes, ad(11, 'halloween', 'value'), ad(12, 'halloween', 'mid'), ad(13, 'halloween', 'premium')];
    const open = [...active, { id: 'halloween', offset: -28 }];
    for (let seed = 1; seed <= 10; seed++) {
      const picked = pickHolidayAds(both, none, open, 3, new Set(['halloween']), new Set(), seeded(seed));
      expect(picked.every((a) => a.holiday === 'halloween')).toBe(true);
    }
    expect(pickHolidayAds(both, none, open, 3, new Set(['easter']))).toEqual([]);
  });

  it('prefers a holiday whose ads are not on the page already', () => {
    const both = [...mooncakes, ad(11, 'halloween', 'value'), ad(12, 'halloween', 'mid'), ad(13, 'halloween', 'premium')];
    const open = [{ id: 'mid-autumn', offset: 0 }, { id: 'halloween', offset: 0 }];
    const shown = new Set(mooncakes.map((a) => a.key));
    for (let seed = 1; seed <= 10; seed++) {
      expect(pickHolidayAds(both, none, open, 3, null, shown, seeded(seed)).every((a) => a.holiday === 'halloween')).toBe(true);
    }
  });

  it('weighs a holiday by how close it is', () => {
    expect(holidayWeight(0)).toBeGreaterThan(holidayWeight(8));
    expect(holidayWeight(8)).toBeGreaterThan(holidayWeight(-25));
    expect(holidayWeight(-3)).toBe(holidayWeight(3));
  });

  it('shows no ads to a signed-in viewer under 13, as for every product ad', () => {
    expect(pickHolidayAds(mooncakes, { ...none, age: 11 }, active, 3)).toEqual([]);
    expect(pickHolidayAds(mooncakes, { ...none, age: 14 }, active, 3)).toHaveLength(3);
  });
});

describe('ordinary picks leave holiday ads to the holiday pick', () => {
  it('never returns a holiday ad from pickAds', () => {
    expect(pickAds(mooncakes, none, 4)).toEqual([]);
  });
});
