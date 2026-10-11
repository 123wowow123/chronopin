import { describe, expect, it } from 'vitest';
import { buildRestaurantSpecialMap } from './restaurantSpecialMap';
import specials from '@/server/data/restaurantSpecials.json';
import menus from '@/server/data/restaurantMenus.json';
import type { RestaurantMenuProfile } from '@/lib/restaurantMenus';

function restaurantSpecialMap(ids: string[]) { return buildRestaurantSpecialMap(ids, [...menus, ...specials] as RestaurantMenuProfile[]); }

describe('restaurant specials on the main map', () => {
  it('plots the requested verified seasonal menu without a discount', () => {
    const special = { kind: 'other' as const, title: 'Seasonal seafood', description: 'Limited menu', sourceUrl: 'https://example.com/seasonal', discounted: false, limitedTime: true, validFrom: '2026-10-16', validThrough: '2026-11-28' };
    const profile = { pinSourceUrl: special.sourceUrl, name: 'Seasonal venue', checkedAt: '2026-10-10', menus: [], specials: [special], location: { latitude: 39.12, longitude: 117.1988, sourceUrl: special.sourceUrl, checkedAt: '2026-10-10' } };
    expect(buildRestaurantSpecialMap([special.sourceUrl + '#0'], [profile])[0].specialLabel).toContain('Seasonal seafood');
    expect(buildRestaurantSpecialMap([special.sourceUrl + '#0'], [{ ...profile, specials: [{ ...special, validThrough: undefined }] }])).toEqual([]);
  });
  const fortOak = 'https://www.fortoaksd.com/#0';
  it('plots exactly the selected curated restaurants without requiring database pins', () => {
    const pins = restaurantSpecialMap([fortOak, fortOak, 'https://unknown.example/#0']);
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({ title: 'Fort Oak', restaurantHref: 'https://www.fortoaksd.com/', categories: ['Food'] });
    expect(pins[0].latitude).toEqual(expect.any(Number));
    expect(pins[0].longitude).toEqual(expect.any(Number));
    expect(pins[0].specialLabel).toContain('Happy hour');
    expect(pins[0].media).toHaveLength(1);
  });
  it('never substitutes a broader list for empty or unknown selections', () => {
    expect(restaurantSpecialMap([])).toEqual([]);
    expect(restaurantSpecialMap(['https://www.fortoaksd.com/#999'])).toEqual([]);
  });
});
