import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { read } = vi.hoisted(() => ({ read: vi.fn().mockResolvedValue([]) }));
vi.mock('@/server/model/industryForecast', () => ({ forecastsBySlugs: read }));
import { GET } from './route';

it('loads every matching sector panel beyond the old twelve-panel cutoff', async () => {
  const slugs = Array.from({ length: 31 }, (_, i) => `sector-${i}`);
  const response = await GET(new NextRequest(`http://localhost/api/industry-forecasts?slugs=${slugs.join(',')}`));
  expect(response.status).toBe(200);
  expect(read).toHaveBeenCalledWith(slugs);
});
