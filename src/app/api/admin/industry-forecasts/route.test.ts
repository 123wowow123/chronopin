import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mock = vi.hoisted(() => ({ auth: vi.fn(), save: vi.fn(), snapshot: vi.fn(), invalidate: vi.fn() }));
vi.mock('@/server/auth', () => ({ requireRole: mock.auth }));
vi.mock('@/server/model/industryForecast', () => ({ saveIndustryForecast: mock.save, saveForecastSnapshot: mock.snapshot }));
vi.mock('next/cache', () => ({ revalidateTag: mock.invalidate }));
import { PUT } from './route';
import { HttpError } from '@/server/http';

const row = {
  slug: 'energy', industry: 'Energy', title: 'Energy outlook', tags: ['Energy'],
  sources: [{ label: 'Publisher', url: 'https://example.com/outlook', date: null, quote: 'Published outlook' }],
  projection: { label: 'Publisher', points: [{ x: '2030', value: 50 }] },
};
const request = () => new NextRequest('http://localhost/api/admin/industry-forecasts', { method: 'PUT', body: JSON.stringify(row) });
beforeEach(() => { vi.resetAllMocks(); });

it('expires cached pin and search matches after a sector is saved', async () => {
  expect((await PUT(request())).status).toBe(200);
  expect(mock.save).toHaveBeenCalledOnce();
  expect(mock.invalidate).toHaveBeenCalledWith('industry-forecasts', { expire: 0 });
});

it('does not save or invalidate matches when unauthorized', async () => {
  mock.auth.mockRejectedValue(new HttpError(403, 'Forbidden'));
  expect((await PUT(request())).status).toBe(403);
  expect(mock.save).not.toHaveBeenCalled();
  expect(mock.invalidate).not.toHaveBeenCalled();
});
