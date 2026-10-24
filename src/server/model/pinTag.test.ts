import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../db', () => ({ query: vi.fn(), transaction: vi.fn() }));
import * as db from '../db';
import PinTag from './pinTag';

beforeEach(() => {
  vi.mocked(db.query).mockReset().mockResolvedValue([]);
  vi.mocked(db.transaction).mockImplementation(async (run) => run(db.query));
});

describe('stored construction site tags', () => {
  it.each(['Proposed', 'In Progress', 'Completed'])('retains %s during an ordinary tag edit without storing derived Thread', async (status) => {
    await PinTag.setUserTags(42, ['Thread', status, 'Solar']);
    const insert = vi.mocked(db.query).mock.calls.find(([sql]) => sql.includes('INSERT INTO "PinTag"'));
    expect(insert?.[1]).toEqual([42, [status, 'Solar'], ['topic', 'topic'], 'user']);
  });

  it('leaves existing status and other tags alone when nothing changed', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{ name: 'Completed' }, { name: 'Solar' }]);
    expect(await PinTag.setUserTags(42, ['Solar', 'Completed'])).toBe(false);
    expect(db.transaction).not.toHaveBeenCalled();
  });
});
