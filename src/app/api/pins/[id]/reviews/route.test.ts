import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { HttpError } from '@/server/util/httpError';
const mocks = vi.hoisted(() => ({ user: vi.fn(), verified: vi.fn(), query: vi.fn(), menu: vi.fn(), forPin: vi.fn(), summary: vi.fn(), save: vi.fn(), remove: vi.fn(), saveWithPhotos: vi.fn() }));
vi.mock('@/server/auth', () => ({ getUser: mocks.user, requireUser: mocks.user }));
vi.mock('@/server/emailVerification', () => ({ requireVerifiedEmail: mocks.verified }));
vi.mock('@/server/db', () => ({ query: mocks.query }));
vi.mock('@/server/services/restaurantContent', () => ({ restaurantMenuProfileFor: mocks.menu }));
vi.mock('@/server/services/reviewPhotos', () => ({ saveReviewWithPhotos: mocks.saveWithPhotos }));
vi.mock('@/server/model/pinReview', () => ({ default: mocks }));
import { GET, PUT, DELETE } from './route';
const ctx = { params: Promise.resolve({ id: '17' }) };
function request(method: string, item?: string, body = { stars: 4, comment: 'Delicious' }) {
  return new NextRequest(`http://localhost/api/pins/17/reviews${item === undefined ? '' : `?item=${encodeURIComponent(item)}`}`, { method, ...(method === 'PUT' ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}) });
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.user.mockResolvedValue({ id: 7 });
  mocks.query.mockResolvedValue([{ id: 17, sourceUrl: 'https://restaurant.example/branch' }]);
  mocks.menu.mockResolvedValue({ menus: [{ items: [{ name: 'Fish & chips' }] }] });
  mocks.forPin.mockResolvedValue([]);
  mocks.summary.mockResolvedValue({ average: null, count: 0 });
  mocks.remove.mockResolvedValue(true);
});
describe('dish review API', () => {
  it('reads dish reviews separately and preserves whole-pin reads', async () => {
    expect((await GET(request('GET', 'Fish & chips'), ctx)).status).toBe(200);
    expect(mocks.forPin).toHaveBeenLastCalledWith(17, 7, 'Fish & chips');
    expect(mocks.summary).toHaveBeenLastCalledWith(17, 'Fish & chips');
    await GET(request('GET'), ctx);
    expect(mocks.forPin).toHaveBeenLastCalledWith(17, 7, '');
  });
  it('saves only a verified reader’s review of an actual branch menu item', async () => {
    expect((await PUT(request('PUT', 'Fish & chips'), ctx)).status).toBe(200);
    expect(mocks.verified).toHaveBeenCalledWith({ id: 7 });
    expect(mocks.save).toHaveBeenCalledWith(17, 7, 4, 'Delicious', 'Fish & chips');
    expect((await PUT(request('PUT', 'Other branch dish'), ctx)).status).toBe(400);
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
  it('rejects unverified readers and malformed ratings or item names', async () => {
    mocks.verified.mockImplementationOnce(() => { throw new HttpError(403, 'Verify email'); });
    expect((await PUT(request('PUT', 'Fish & chips'), ctx)).status).toBe(403);
    expect((await PUT(request('PUT', 'Fish & chips', { stars: 6, comment: '' }), ctx)).status).toBe(400);
    expect((await PUT(request('PUT', '  '), ctx)).status).toBe(400);
    expect((await PUT(request('PUT', 'x'.repeat(501)), ctx)).status).toBe(400);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it('removes only the signed-in reader’s review for the selected dish', async () => {
    expect((await DELETE(request('DELETE', 'Fish & chips'), ctx)).status).toBe(204);
    expect(mocks.remove).toHaveBeenCalledWith(17, 7, 'Fish & chips');
  });
});

it('accepts photo files with a dish review and passes the authenticated owner', async () => {
  const form = new FormData();
  form.set('stars', '5'); form.set('comment', 'Great dish');
  form.append('photos', new File(['image bytes'], 'dish.jpg', { type: 'image/jpeg' }));
  mocks.saveWithPhotos.mockResolvedValue({ id: 31, photos: [{ id: 42 }] });
  const response = await PUT(new NextRequest('http://localhost/api/pins/17/reviews?item=Fish%20%26%20chips', { method: 'PUT', body: form }), ctx);
  expect(response.status).toBe(200);
  expect(mocks.saveWithPhotos).toHaveBeenCalledWith(expect.objectContaining({ pinId: 17, userId: 7, menuItem: 'Fish & chips', stars: 5, comment: 'Great dish', files: [expect.any(File)], removePhotoIds: [] }));
  expect(mocks.save).not.toHaveBeenCalled();
});
it('rejects malformed attachment removals before saving', async () => {
  const req = new NextRequest('http://localhost/api/pins/17/reviews?item=Fish%20%26%20chips', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stars: 5, removePhotoIds: ['other-user-photo'] }) });
  expect((await PUT(req, ctx)).status).toBe(400);
  expect(mocks.saveWithPhotos).not.toHaveBeenCalled();
});
