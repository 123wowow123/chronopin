import { afterEach, expect, it, vi } from 'vitest';
const { contentForSource, specialVenueForSource, query, invalidatePin, revalidateTag } = vi.hoisted(() => ({ contentForSource: vi.fn(), specialVenueForSource: vi.fn(), query: vi.fn(), invalidatePin: vi.fn(), revalidateTag: vi.fn() }));
vi.mock('../model/restaurantContent', () => ({ contentForSource }));
vi.mock('../model/restaurantSpecialVenue', () => ({ specialVenueForSource }));
vi.mock('../db', () => ({ query }));
vi.mock('next/cache', () => ({ revalidateTag }));
vi.mock('./cache', () => ({ TAGS: { restaurantContent: 'restaurant-content' }, invalidatePin }));
import { invalidateRestaurantContent, restaurantMenuProfileFor } from './restaurantContent';
afterEach(() => vi.resetAllMocks());
it('reads current database menus and never resurrects removed catalog menus', async () => {
  contentForSource.mockResolvedValueOnce({ profile: { menu: { name: 'MUME updated', menus: [], specials: [] } } }).mockResolvedValueOnce(null);
  specialVenueForSource.mockResolvedValue(null);
  expect((await restaurantMenuProfileFor('https://mume.tw/reservation'))?.name).toBe('MUME updated');
  expect(await restaurantMenuProfileFor('https://mume.tw/reservation')).toBeUndefined();
});
it('retains ordinary menus alongside offer menus, using the managed offer price on collisions', async () => {
  contentForSource.mockResolvedValue({ profile: { menu: { menus: [{ label: 'Dinner', items: [] }, { label: 'Happy hour', items: [{ price: 20 }] }], specials: [] } } });
  specialVenueForSource.mockResolvedValue({ profile: { menus: [{ label: 'Happy hour', items: [{ price: 10 }] }], specials: [{ title: 'Offer' }] } });
  const result = await restaurantMenuProfileFor('https://example.com');
  expect(result?.menus).toEqual([{ label: 'Dinner', items: [] }, { label: 'Happy hour', items: [{ price: 10 }] }]);
  expect(result?.specials).toHaveLength(1);
});
it('immediately expires guide caches and only matching branch pin pages', async () => {
  query.mockResolvedValue([{ id: 1, sourceUrl: 'https://www.example.com/taipei/' }, { id: 2, sourceUrl: 'https://example.com/taipei#other-branch' }]);
  await invalidateRestaurantContent('https://example.com/taipei');
  expect(invalidatePin).toHaveBeenCalledExactlyOnceWith(1);
  expect(revalidateTag).toHaveBeenCalledExactlyOnceWith('restaurant-content', { expire: 0 });
});
