import { beforeEach, describe, expect, it, vi } from 'vitest';
const { query, transaction } = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock('../db', () => ({ query, transaction }));
import { contentForSource, createRestaurantContent, updateRestaurantContent } from './restaurantContent';
const profile = { pinSourceUrl: 'https://example.com/taipei', menu: { pinSourceUrl: 'https://example.com/taipei', name: 'Example', checkedAt: '2026-10-10', menus: [], specials: [] } };
const row = { id: 1, profile, enabled: true, revision: 2 };
beforeEach(() => { vi.resetAllMocks(); transaction.mockImplementation((run) => run(query)); });
describe('managed restaurant content', () => {
  it('has no catalog fallback for missing or archived content', async () => {
    query.mockResolvedValue([]);
    expect(await contentForSource('https://mume.tw/reservation')).toBeNull();
    expect(query.mock.calls[0][0]).toContain('"enabled"');
  });
  it('refuses stale updates before writing or auditing', async () => {
    query.mockResolvedValueOnce([row]);
    await expect(updateRestaurantContent(1, 1, { profile, enabled: true }, 7)).rejects.toMatchObject({ status: 409 });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('archives with a new revision and an audit in the same transaction', async () => {
    query.mockResolvedValueOnce([row]).mockResolvedValueOnce([{ ...row, enabled: false, revision: 3 }]).mockResolvedValueOnce([]);
    expect(await updateRestaurantContent(1, 2, { enabled: false }, 7)).toMatchObject({ enabled: false, revision: 3 });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[2][0]).toContain('"AdminAudit"');
  });
  it('refuses duplicate source records without overwriting content', async () => {
    query.mockResolvedValueOnce([]);
    await expect(createRestaurantContent({ profile, enabled: true }, 7)).rejects.toMatchObject({ status: 409 });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
