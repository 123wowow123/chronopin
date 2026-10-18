import { describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db', () => ({ query, transaction: vi.fn() }));
import { seedRestaurants } from './restaurantSeed';
import catalog from '@/server/data/regionalRestaurants.json';

describe('seedRestaurants', () => {
  it('rejects unknown regions before touching the database', async () => {
    await expect(seedRestaurants({ regions: ['atlantis'] })).rejects.toMatchObject({ status: 400 });
    expect(query).not.toHaveBeenCalled();
  });
  it('dry run lists missing pins and photos without writing', async () => {
    query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([]);
    const result = await seedRestaurants({ regions: ['nashville'], dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.pinsAdded).toEqual([]);
    expect(result.pinsWouldAdd.some((title) => title.startsWith('Bastion'))).toBe(true);
    expect(result.venuesValidated).toBeGreaterThan(0);
  });
  it('adds missing gallery photos to a pin that already has a photo', async () => {
    const restaurant = catalog.find((item) => item.slug === 'mume')!;
    query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([{ id: 42, sourceUrl: restaurant.sourceUrl, title: 'MUME', media: 1, images: [restaurant.image] }]);
    const result = await seedRestaurants({ regions: ['taipei'], dryRun: true });
    expect(result.mediaAttached).toEqual([{ id: 42, title: 'MUME — Taipei restaurant guide' }]);
  });
  it('does not attach an already imported gallery again', async () => {
    const restaurant = catalog.find((item) => item.slug === 'mume')!;
    query.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([{ id: 42, sourceUrl: restaurant.sourceUrl, title: 'MUME', media: 7, images: restaurant.galleryImages!.map((photo) => photo.image) }]);
    const result = await seedRestaurants({ regions: ['taipei'], dryRun: true });
    expect(result.mediaAttached).toEqual([]);
  });
});
