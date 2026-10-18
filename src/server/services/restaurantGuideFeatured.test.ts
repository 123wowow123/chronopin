import { expect, it, vi } from 'vitest';
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('./restaurants', () => ({
  regionalRestaurants: async () => ({ restaurants: [{ id: 1, name: 'Upcoming', day: '2099-10-31', confirmed: false, neighborhood: 'Jing’an', image: null }], previewSnapshot: false }),
  regionalTopRestaurants: async () => [{ pinId: 2, name: 'Calypso', neighborhood: 'Jing’an', image: 'https://chronopin.blob.core.windows.net/thumb/photo.webp' }],
}));
vi.mock('./restaurantOffers', () => ({ regionalRestaurantOffers: async () => [] }));
vi.mock('./restaurantGuideDetails', () => ({ restaurantGuideDetails: async () => ({}) }));
import { guideSummary } from './restaurantGuidePage';
it('retains a credited established restaurant hero when upcoming venues have no photos', async () => {
  const summary = await guideSummary('shanghai', new Date('2026-10-10T00:00:00Z'));
  expect(summary?.featured).toBeNull();
  expect(summary?.featuredTop).toMatchObject({ pinId: 2, name: 'Calypso' });
  expect(summary?.counts.upcoming).toBe(1);
});
