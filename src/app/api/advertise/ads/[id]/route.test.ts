import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ user: vi.fn(), owned: vi.fn(), update: vi.fn(), expire: vi.fn(), schedule: vi.fn() }));
vi.mock('@/server/auth', () => ({ requireUser: mocks.user }));
vi.mock('@/server/model/sponsoredAd', () => ({ default: { getOwned: mocks.owned, adminUpdate: mocks.update } }));
vi.mock('@/server/model/ad', () => ({ default: { expireInventory: mocks.expire } }));
vi.mock('@/server/services/sponsoredAdTranslations', () => ({ scheduleAdTranslation: mocks.schedule }));
import { PATCH } from './route';

function request(body: unknown) {
  return new Request('http://localhost/api/advertise/ads/2', { method: 'PATCH', body: JSON.stringify(body) }) as NextRequest;
}
const context = { params: Promise.resolve({ id: '2' }) };
beforeEach(() => { vi.clearAllMocks(); mocks.user.mockResolvedValue({ id: 1 }); });
describe('ad translation toggle API', () => {
  it('allows an owner to enable translations on an already live ad', async () => {
    mocks.owned.mockResolvedValue({ id: 2, userId: 1, status: 'active' });
    mocks.update.mockResolvedValue({ id: 2, autoTranslate: true });
    const response = await PATCH(request({ autoTranslate: true }), context);
    expect(response.status).toBe(200);
    expect(mocks.owned).toHaveBeenCalledWith(2, 1);
    expect(mocks.update).toHaveBeenCalledWith(2, { autoTranslate: true });
    expect(mocks.schedule).toHaveBeenCalledWith({ id: 2, autoTranslate: true });
  });
  it('refuses access to another advertiser’s ad', async () => {
    mocks.owned.mockResolvedValue(null);
    expect((await PATCH(request({ autoTranslate: true }), context)).status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });
  it.each(['false', 1, null])('rejects a non-boolean toggle %s', async (autoTranslate) => {
    expect((await PATCH(request({ autoTranslate }), context)).status).toBe(422);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
