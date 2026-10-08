import { describe, expect, it } from 'vitest';
import { restaurantTabCoverage } from './restaurantCoverage';

describe('restaurant tab replenishment', () => {
  it('counts visible openings only and never treats a passed estimate as opened', () => {
    const result = restaurantTabCoverage([
      { id: 1, day: '2026-11-01', confirmed: false },
      { id: 2, day: '2026-10-01', confirmed: false },
      { id: 3, day: '2026-10-01', confirmed: true },
      { id: 4, day: '2026-06-01', confirmed: true },
      { id: 3, day: '2026-10-01', confirmed: true },
    ], [10, 10, 11], '2026-10-07');
    expect(result).toEqual({ targetPerTab: 12, counts: { upcoming: 2, new: 1, top: 2 }, needed: { upcoming: 10, new: 11, top: 10 } });
  });

  it('does not request more pins for a tab already meeting the target', () => {
    const openings = Array.from({ length: 15 }, (_, id) => ({ id, day: '2026-10-10', confirmed: false }));
    expect(restaurantTabCoverage(openings, Array.from({ length: 12 }, (_, id) => id), '2026-10-07').needed).toEqual({ upcoming: 0, new: 12, top: 0 });
  });
});
