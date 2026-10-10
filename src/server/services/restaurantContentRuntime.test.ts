import { afterEach, expect, it, vi } from 'vitest';
const { listRestaurantContent, findBySourceUrls, query } = vi.hoisted(() => ({ listRestaurantContent: vi.fn(), findBySourceUrls: vi.fn(), query: vi.fn() }));
vi.mock('../model/restaurantContent', () => ({ listRestaurantContent }));
vi.mock('../model/restaurantSpecialVenue', () => ({ listSpecialVenues: async () => [] }));
vi.mock('../model/pin', () => ({ default: { findBySourceUrls } }));
vi.mock('../model/pins', () => ({ default: {} }));
vi.mock('../db', () => ({ query }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
import { regionalTopRestaurants } from './restaurants';
import { restaurantGuideDetails } from './restaurantGuideDetails';
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
