import { describe, expect, it, vi } from 'vitest';

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db', () => ({ query, transaction: vi.fn() }));
import { seedRestaurants } from './restaurantSeed';

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
});
