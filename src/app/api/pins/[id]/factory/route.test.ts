import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { readFileSync } from 'node:fs';
const mock = vi.hoisted(() => ({ query: vi.fn(), user: vi.fn(), read: vi.fn(), save: vi.fn(), remove: vi.fn(), invalidate: vi.fn() }));
vi.mock('@/server/db', () => ({ query: mock.query }));
vi.mock('@/server/auth', () => ({ requireUser: mock.user, isAdmin: (u: { role?: string }) => u.role === 'admin' }));
vi.mock('@/server/model/pinFactory', async importOriginal => ({ ...await importOriginal<object>(), factoryForPin: mock.read, saveFactory: mock.save, deleteFactory: mock.remove }));
vi.mock('@/server/services/cache', () => ({ invalidatePin: mock.invalidate }));
import { HttpError } from '@/server/http';
import { GET, PUT, DELETE } from './route';
const body = JSON.parse(readFileSync('scripts/factories/capability.json', 'utf8'))[0].profile;
const ctx = () => ({ params: Promise.resolve({ id: '123' }) });
const req = (method = 'PUT', payload: unknown = body) => new NextRequest('http://localhost:3000/api/pins/123/factory', { method, ...(method === 'PUT' ? { body: JSON.stringify(payload) } : {}) });
beforeEach(() => {
  vi.resetAllMocks();
  mock.query.mockResolvedValue([{ userId: 42 }]);
  mock.user.mockResolvedValue({ id: 42, role: 'user' });
  mock.read.mockResolvedValue({ ...body, checkedAt: '2026-10-24T00:00:00Z' });
  mock.save.mockResolvedValue(true);
});
describe('factory API access and state transitions', () => {
  it('does not expose profiles for a deleted or nonexistent pin', async () => {
    mock.query.mockResolvedValue([]);
    expect((await GET(req('GET'), ctx())).status).toBe(404);
    expect(mock.read).not.toHaveBeenCalled();
  });
  it('returns 204 for a live pin with no profile', async () => {
    mock.read.mockResolvedValue(null);
    expect((await GET(req('GET'), ctx())).status).toBe(204);
  });
  it('requires authentication for writes', async () => {
    mock.user.mockRejectedValue(new HttpError(401, 'Unauthorized'));
    expect((await PUT(req(), ctx())).status).toBe(401);
    expect(mock.save).not.toHaveBeenCalled();
  });
  it('refuses another user’s edits and deletions', async () => {
    mock.user.mockResolvedValue({ id: 99, role: 'user' });
    expect((await PUT(req(), ctx())).status).toBe(403);
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(403);
    expect(mock.save).not.toHaveBeenCalled();
    expect(mock.remove).not.toHaveBeenCalled();
  });
  it('allows an admin to write and immediately invalidates the page', async () => {
    mock.user.mockResolvedValue({ id: 99, role: 'admin' });
    expect((await PUT(req(), ctx())).status).toBe(200);
    expect(mock.save).toHaveBeenCalledWith(123, body);
    expect(mock.invalidate).toHaveBeenCalledWith(123);
  });
  it('rejects a malformed profile before saving', async () => {
    expect((await PUT(req('PUT', { ...body, axes: {} }), ctx())).status).toBe(400);
    expect(mock.save).not.toHaveBeenCalled();
    expect(mock.invalidate).not.toHaveBeenCalled();
  });
  it('preserves hand-entered profiles on a conflict', async () => {
    mock.save.mockResolvedValue(false);
    expect((await PUT(req(), ctx())).status).toBe(409);
    expect(mock.invalidate).not.toHaveBeenCalled();
  });
  it('allows the author to delete just the profile', async () => {
    expect((await DELETE(req('DELETE'), ctx())).status).toBe(204);
    expect(mock.remove).toHaveBeenCalledWith(123);
    expect(mock.invalidate).toHaveBeenCalledWith(123);
  });
});
