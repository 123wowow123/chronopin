import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn(), save: vi.fn(), forPin: vi.fn(), create: vi.fn(), countToday: vi.fn(), store: vi.fn(), removeBlob: vi.fn() }));
vi.mock('@/server/db', () => ({ query: mock.query, transaction: mock.transaction }));
vi.mock('@/server/model/pinReview', () => ({ default: { save: mock.save, forPin: mock.forPin } }));
vi.mock('@/server/model/pinPhoto', () => ({ PIN_PHOTO_DAILY_LIMIT: 20, default: { create: mock.create, countToday: mock.countToday } }));
vi.mock('./pinPhotos', () => ({ savePinPhoto: mock.store }));
vi.mock('@/server/azureBlob', () => ({ deleteThumb: mock.removeBlob }));
import { saveReviewWithPhotos } from './reviewPhotos';
const photo = () => new File(['photo'], 'dish.jpg', { type: 'image/jpeg' });
const input = () => ({ pinId: 1, userId: 2, isAdmin: false, stars: 5, comment: 'Tasty', menuItem: 'Taco', files: [photo()], removePhotoIds: [] as number[] });
beforeEach(() => {
  vi.resetAllMocks();
  mock.transaction.mockImplementation((run) => run(mock.query));
  mock.store.mockResolvedValue({ blobName: 'new-photo.jpg', width: 100, height: 80 });
  mock.save.mockResolvedValue({ id: 7, photos: [] });
  mock.forPin.mockResolvedValue([{ id: 7, mine: true, photos: [{ id: 8 }] }]);
  mock.countToday.mockResolvedValue(0);
});
it('attaches uploads to the exact saved review in one transaction', async () => {
  const review = await saveReviewWithPhotos(input());
  expect(mock.save).toHaveBeenCalledWith(1, 2, 5, 'Tasty', 'Taco', mock.query);
  expect(mock.create).toHaveBeenCalledWith(expect.objectContaining({ reviewId: 7, pinId: 1, userId: 2, blobName: 'new-photo.jpg', caption: 'Taco' }), mock.query);
  expect(review.photos).toEqual([{ id: 8 }]);
});
it('rejects wrong types and excess uploads without storing files', async () => {
  await expect(saveReviewWithPhotos({ ...input(), files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })] })).rejects.toMatchObject({ status: 400 });
  await expect(saveReviewWithPhotos({ ...input(), files: Array.from({ length: 6 }, photo) })).rejects.toMatchObject({ status: 400 });
  mock.countToday.mockResolvedValue(20);
  await expect(saveReviewWithPhotos(input())).rejects.toMatchObject({ status: 429 });
  expect(mock.store).not.toHaveBeenCalled();
});
it('cleans new blobs when the transaction fails', async () => {
  mock.transaction.mockRejectedValue(new Error('Database failed'));
  await expect(saveReviewWithPhotos(input())).rejects.toThrow('Database failed');
  expect(mock.removeBlob).toHaveBeenCalledWith('new-photo.jpg');
});
it('refuses to remove an attachment from another review and cleans new uploads', async () => {
  await expect(saveReviewWithPhotos({ ...input(), removePhotoIds: [999] })).rejects.toMatchObject({ status: 400 });
  expect(mock.query).not.toHaveBeenCalled();
  expect(mock.removeBlob).toHaveBeenCalledWith('new-photo.jpg');
});
it('enforces the total attachment limit, including existing photos', async () => {
  mock.save.mockResolvedValue({ id: 7, photos: Array.from({ length: 5 }, (_, id) => ({ id })) });
  await expect(saveReviewWithPhotos(input())).rejects.toMatchObject({ status: 400 });
  expect(mock.create).not.toHaveBeenCalled();
  expect(mock.removeBlob).toHaveBeenCalledWith('new-photo.jpg');
});
it('removes only photos owned by the saved review and reader', async () => {
  mock.save.mockResolvedValue({ id: 7, photos: [{ id: 8 }] });
  await saveReviewWithPhotos({ ...input(), files: [], removePhotoIds: [8] });
  expect(mock.query).toHaveBeenCalledWith(expect.stringContaining('"reviewId" = $1 AND "userId" = $2'), [7, 2, [8]]);
});
