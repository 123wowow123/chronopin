import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { HttpError } from '@/server/http';
const mocks = vi.hoisted(() => ({ role: vi.fn(), read: vi.fn(), save: vi.fn() }));
vi.mock('@/server/auth', () => ({ requireRole: mocks.role }));
vi.mock('@/server/services/sponsoredAdTranslationApi', () => ({ exportAdTranslations: mocks.read, applyAdTranslations: mocks.save }));
import { GET, POST } from './route';
const context = { params: Promise.resolve({ id: '2' }) };
beforeEach(() => { vi.clearAllMocks(); mocks.role.mockResolvedValue({ id: 1, role: 'admin' }); });
it('exports only after checking the admin role, with private no-store responses', async () => {
  mocks.read.mockResolvedValue({ id: 2, sourceHash: 'hash' });
  const response = await GET(new NextRequest('http://localhost/api/admin/sponsored-ads/2/translations'), context);
  expect(mocks.role).toHaveBeenCalledWith('admin', expect.anything());
  expect(mocks.read).toHaveBeenCalledWith(2);
  expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
it('saves the session payload through the admin endpoint', async () => {
  const input = { sourceHash: 'hash', translations: { es: { title: 'Sin anuncios', body: '' } } };
  mocks.save.mockResolvedValue({ saved: 1 });
  const response = await POST(new NextRequest('http://localhost/api/admin/sponsored-ads/2/translations', { method: 'POST', body: JSON.stringify(input) }), context);
  expect(response.status).toBe(200);
  expect(mocks.save).toHaveBeenCalledWith(2, input);
});
it('refuses reads and writes from non-admin callers', async () => {
  mocks.role.mockRejectedValue(new HttpError(403, 'Forbidden'));
  expect((await GET(new NextRequest('http://localhost/api/admin/sponsored-ads/2/translations'), context)).status).toBe(403);
  expect((await POST(new NextRequest('http://localhost/api/admin/sponsored-ads/2/translations', { method: 'POST', body: '{}' }), context)).status).toBe(403);
  expect(mocks.read).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
});
