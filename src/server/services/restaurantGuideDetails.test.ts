import { beforeEach, expect, it, vi } from 'vitest';
import type { Restaurant, TopRestaurant } from '@/lib/restaurants';
import type { RestaurantMenu } from '@/lib/restaurantMenus';
const { content, venues, fallback } = vi.hoisted(() => ({ content: vi.fn(), venues: vi.fn(), fallback: vi.fn() }));
vi.mock('@/server/db', () => ({ query: async () => [] }));
vi.mock('@/server/model/restaurantContent', () => ({ listRestaurantContent: content }));
vi.mock('@/server/model/restaurantSpecialVenue', () => ({ listSpecialVenues: venues }));
vi.mock('./restaurantPhotos', () => ({ restaurantPinPhotos: async () => ({}) }));
vi.mock('@/lib/restaurantMenus', async (original) => ({ ...await original<typeof import('@/lib/restaurantMenus')>(), restaurantMenuFor: fallback }));
import { restaurantGuideDetails } from './restaurantGuideDetails';
const source = 'https://example.com/exact-branch';
const restaurants = [{ id: 1, sourceUrl: source }] as Restaurant[];
const tops: TopRestaurant[] = [];
const image = { src: 'https://chronopin.blob.core.windows.net/photos/soup.webp', caption: 'Soup', credit: 'Restaurant', sourceUrl: source };
const review = { provider: 'Critic', title: 'Dinner', sourceUrl: source, quote: 'Excellent soup', publishedDate: null, checkedAt: '2026-11-08' };
const dinner: RestaurantMenu = { label: 'Dinner', url: source, coverage: 'published', items: [...Array.from({ length: 6 }, (_, i) => ({ name: `Dish ${i}` })), { name: 'Soup', image, reviews: [review] }] };
beforeEach(() => { content.mockResolvedValue([]); venues.mockResolvedValue([]); fallback.mockReturnValue(undefined); });
it('retains later dishes, their photos and reviews, and all ordinary menus', async () => {
  const dessert = { ...dinner, label: 'Dessert', items: [{ name: 'Cake' }] };
  content.mockResolvedValue([{ profile: { pinSourceUrl: source, menu: { menus: [dinner, dessert] } } }]);
  const details = (await restaurantGuideDetails(restaurants, tops))[1];
  expect(details.menus).toEqual([dinner, dessert]);
  expect(details.menus?.[0].items[6]).toMatchObject({ image, reviews: [review] });
  expect(details.menus?.[0].coverage).toBe('published');
});
it('uses exact-branch specials precedence and retains other ordinary menus', async () => {
  const lunch = { ...dinner, label: 'Lunch' };
  const replacement = { ...dinner, items: [{ name: 'Special soup', image, reviews: [review] }] };
  content.mockResolvedValue([{ profile: { pinSourceUrl: source, menu: { menus: [dinner, lunch] } } }]);
  venues.mockResolvedValue([{ profile: { pinSourceUrl: source, menus: [replacement] } }, { profile: { pinSourceUrl: 'https://example.com/other-branch', menus: [{ ...lunch, label: 'Wrong branch' }] } }]);
  expect((await restaurantGuideDetails(restaurants, tops))[1].menus).toEqual([replacement, lunch]);
});
it('does not revive removed menus from bundled snapshots', async () => {
  fallback.mockReturnValue({ menus: [dinner] });
  expect((await restaurantGuideDetails(restaurants, tops))[1].menus).toEqual([]);
});
