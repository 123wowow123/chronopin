import { expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db', () => ({ query }));
import { restaurantPinPhotos } from './restaurantPhotos';

it('loads branch-specific non-deleted images in one batch, preserving native credits', async () => {
  query.mockResolvedValue([
    { pinId: 1, thumbName: 'one.webp', originalUrl: 'https://venue/one.jpg', authorName: 'Venue photographer', authorUrl: 'https://venue/gallery', title: 'First restaurant' },
    { pinId: 2, thumbName: 'two.webp', originalUrl: 'https://other/two.jpg', authorName: null, authorUrl: null, title: 'Other restaurant' },
  ]);
  const photos = await restaurantPinPhotos([1, 2, 1]);
  expect(query).toHaveBeenCalledWith(expect.stringContaining('pm."utcDeletedDateTime" IS NULL'), [[1, 2], 1]);
  expect(photos[1]).toHaveLength(1);
  expect(photos[1][0]).toMatchObject({ credit: 'Venue photographer', sourceUrl: 'https://venue/gallery' });
  expect(photos[2][0].originalUrl).toBe('https://other/two.jpg');
});
