import { describe, expect, it } from 'vitest';
import { restaurantTabCoverage, restaurantTabTarget } from './restaurantCoverage';

describe('restaurant tab replenishment', () => {
  it('counts visible openings only and never treats a passed estimate as opened', () => {
    const result = restaurantTabCoverage([
      { id: 1, day: '2026-11-01', confirmed: false },
      { id: 2, day: '2026-10-01', confirmed: false },
      { id: 3, day: '2026-10-01', confirmed: true },
      { id: 4, day: '2026-06-01', confirmed: true },
      { id: 3, day: '2026-10-01', confirmed: true },
    ], [10, 10, 11], '2026-10-07');
    expect(result).toEqual({ targetPerTab: 12, counts: { upcoming: 2, new: 1, top: 2, discounts: 0 }, needed: { upcoming: 10, new: 11, top: 10, discounts: 12 } });
  });

  it('does not request more pins for a tab already meeting the target', () => {
    const openings = Array.from({ length: 15 }, (_, id) => ({ id, day: '2026-10-10', confirmed: false }));
    expect(restaurantTabCoverage(openings, Array.from({ length: 12 }, (_, id) => id), '2026-10-07').needed).toEqual({ upcoming: 0, new: 12, top: 0, discounts: 12 });
  });
  it('targets 20 in China and counts distinct restaurants across special sections', () => {
    expect(restaurantTabTarget('China')).toBe(20);
    expect(restaurantTabTarget('France')).toBe(12);
    const result = restaurantTabCoverage([], Array.from({ length: 19 }, (_, id) => id), '2026-10-11', {
      target: restaurantTabTarget('China'), specialRestaurantIds: ['branch-a', 'branch-a', 'branch-b'],
    });
    expect(result).toEqual({ targetPerTab: 20, counts: { upcoming: 0, new: 0, top: 19, discounts: 2 }, needed: { upcoming: 20, new: 20, top: 1, discounts: 18 } });
  });

  it('treats 20 as a minimum target, without capping a larger collection', () => {
    const openings = Array.from({ length: 21 }, (_, id) => ({ id, day: '2026-11-01', confirmed: false }));
    const result = restaurantTabCoverage(openings, Array.from({ length: 20 }, (_, id) => id), '2026-10-11', {
      target: 20, specialRestaurantIds: Array.from({ length: 22 }, (_, id) => `branch-${id}`),
    });
    expect(result.counts).toEqual({ upcoming: 21, new: 0, top: 20, discounts: 22 });
    expect(result.needed).toEqual({ upcoming: 0, new: 20, top: 0, discounts: 0 });
  });
});
