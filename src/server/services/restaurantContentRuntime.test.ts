import { afterEach, expect, it, vi } from 'vitest';
const { listRestaurantContent, findBySourceUrls, query } = vi.hoisted(() => ({ listRestaurantContent: vi.fn(), findBySourceUrls: vi.fn(), query: vi.fn() }));
vi.mock('../model/restaurantContent', () => ({ listRestaurantContent }));
vi.mock('../model/restaurantSpecialVenue', () => ({ listSpecialVenues: async () => [] }));
vi.mock('../model/pin', () => ({ default: { findBySourceUrls } }));
vi.mock('../model/pins', () => ({ default: {} }));
vi.mock('../db', () => ({ query }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
import { regionalTopRestaurants } from './restaurants';
import { hasKidsMenu, restaurantGuideDetails } from './restaurantGuideDetails';
import { legacyRestaurantContent } from '../../../scripts/restaurants/seedContent';
const profile = legacyRestaurantContent().find((p) => p.tile?.name === 'MUME')!;
afterEach(() => vi.resetAllMocks());
it('uses edited database tiles and does not revive removed bundled selections', async () => {
  const updated = structuredClone(profile); updated.tile!.name = 'Current database title';
  listRestaurantContent.mockResolvedValueOnce([{ profile: updated, enabled: true }]).mockResolvedValueOnce([]);
  findBySourceUrls.mockResolvedValue(new Map([[profile.pinSourceUrl, { id: 12, title: 'Pin title' }]]));
  expect(await regionalTopRestaurants('taipei')).toMatchObject([{ name: 'Current database title', pinId: 12 }]);
  expect(await regionalTopRestaurants('taipei')).toEqual([]);
});
it('uses current database menu prices on cards and removes deleted menus', async () => {
  const updated = structuredClone(profile); updated.menu!.menus[0].items[0].price = 3990;
  listRestaurantContent.mockResolvedValueOnce([{ profile: updated }]).mockResolvedValueOnce([]);
  query.mockResolvedValue([]);
  const tops = [{ ...profile.tile!, sourceUrl: profile.pinSourceUrl, pinId: 12, pinTitle: 'Pin title' }];
  expect((await restaurantGuideDetails([], tops))[12].menu?.items[0].price).toBe(3990);
  expect((await restaurantGuideDetails([], tops))[12]?.menu).toBeUndefined();
});
it('identifies kids menus accurately without false positives', () => {
  expect(hasKidsMenu({ label: "Kids' Menu", items: [] })).toBe(true);
  expect(hasKidsMenu({ note: 'Special options for children under 10', items: [] })).toBe(true);
  expect(hasKidsMenu({ items: [{ name: 'Kids Cheese Pizza' }] })).toBe(true);
  expect(hasKidsMenu({ items: [{ name: 'Cheeseburger', category: "Children's Menu" }] })).toBe(true);
  expect(hasKidsMenu({ items: [{ name: 'Kidney Bean Salad', category: 'Sides' }] })).toBe(false);
  expect(hasKidsMenu({ items: [{ name: 'Orchid Cocktail', category: 'Drinks' }] })).toBe(false);
  expect(hasKidsMenu(undefined)).toBe(false);
});
it('resolves kidsFriendly from tags, menus, and content profiles in restaurantGuideDetails', async () => {
  query.mockResolvedValueOnce([{ id: 101, latitude: 32.7, longitude: -117.1, ratings: null, tags: ['Family', 'Outdoor'] }]);
  listRestaurantContent.mockResolvedValueOnce([]);
  const guide1 = await restaurantGuideDetails([{ id: 101, sourceUrl: 'https://example.com/family-spot' } as any], []);
  expect(guide1[101]?.kidsFriendly).toBe(true);

  query.mockResolvedValueOnce([{ id: 102, latitude: null, longitude: null, ratings: null, tags: [] }]);
  listRestaurantContent.mockResolvedValueOnce([{
    profile: {
      pinSourceUrl: 'https://example.com/menu-spot',
      menu: { menus: [{ label: 'Main', items: [{ name: "Kid's Mac & Cheese" }] }] },
    },
  }]);
  const guide2 = await restaurantGuideDetails([{ id: 102, sourceUrl: 'https://example.com/menu-spot' } as any], []);
  expect(guide2[102]?.kidsFriendly).toBe(true);
});

