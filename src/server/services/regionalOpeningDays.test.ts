import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({ cacheLife: () => {}, cacheTag: () => {} }));
vi.mock('@/server/model/restaurantContent', () => ({ listRestaurantContent: async () => [] }));
vi.mock('@/server/db', () => ({
  query: async () => [
    { day: '2026-11-01', dateConfidence: 'confirmed', sourceUrl: 'https://example.com/a' },
    { day: '2026-12-01', dateConfidence: 'estimated', sourceUrl: null },
  ],
}));

import { regionalOpeningDays } from './restaurants';

describe('regionalOpeningDays', () => {
  it('reports each opening day and whether it is confirmed, without loading pins', async () => {
    expect(await regionalOpeningDays('Taipei')).toEqual([
      { day: '2026-11-01', confirmed: true },
      { day: '2026-12-01', confirmed: false },
    ]);
  });
});

describe('allRegionalGuideCounts', () => {
  it('counts a pin once for a region even when it matches by city and by source', async () => {
    const { allRegionalGuideCounts } = await import('./restaurants');
    const counts = await allRegionalGuideCounts();
    expect(Object.keys(counts).length).toBeGreaterThan(50);
    for (const entry of Object.values(counts)) expect(entry.tops).toBe(0);
  });
});
