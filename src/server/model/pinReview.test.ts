import { beforeEach, expect, it, vi } from 'vitest';
const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db', () => ({ query }));
import PinReview from './pinReview';
beforeEach(() => { query.mockReset().mockResolvedValue([]); });
it('keeps dish stars out of whole-pin landing summaries', async () => {
  await PinReview.summaries([1, 2]);
  expect(query.mock.calls[0][0]).toContain('"menuItem" = $2');
  expect(query.mock.calls[0][1]).toEqual([[1, 2], '']);
  await PinReview.summary(1, 'Soup');
  expect(query.mock.calls[1][1]).toEqual([[1], 'Soup']);
});
it('scopes upserts and deletions to pin, reader and dish', async () => {
  await PinReview.save(1, 2, 5, ' Nice ', 'Soup');
  expect(query.mock.calls[0][0]).toContain('ON CONFLICT ("pinId", "userId", "menuItem")');
  expect(query.mock.calls[0][1]).toEqual([1, 2, 5, 'Nice', 'Soup']);
  await PinReview.remove(1, 2, 'Soup');
  expect(query.mock.calls[2][0]).toContain('"menuItem" = $3');
  expect(query.mock.calls[2][1]).toEqual([1, 2, 'Soup']);
});
it('batches dish averages and counts by restaurant and includes empty restaurants without mixing whole-pin reviews', async () => {
  query.mockResolvedValueOnce([{ pinId: 1, menuItem: 'Soup', average: 4.5, count: 2 }, { pinId: 1, menuItem: 'Bread', average: 3, count: 1 }]);
  expect(await PinReview.menuItemSummaries([1, 2])).toEqual({ 1: { Soup: { average: 4.5, count: 2 }, Bread: { average: 3, count: 1 } }, 2: {} });
  expect(query.mock.calls[0][0]).toContain('r."menuItem" <> \'\'');
  expect(query.mock.calls[0][0]).toContain('AVG(r."stars")');
  expect(query.mock.calls[0][0]).toContain('u."utcDeletedDateTime" IS NULL');
  expect(query.mock.calls[0][1]).toEqual([[1, 2]]);
});
