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
