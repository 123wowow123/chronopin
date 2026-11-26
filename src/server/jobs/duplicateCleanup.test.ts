import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => {
  class ApiCallError extends Error {
    constructor(
      readonly status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return { ApiCallError, duplicateRows: vi.fn(), getPin: vi.fn(), markDuplicate: vi.fn(), decideDuplicatePair: vi.fn() };
});
vi.mock('./pinApi', () => api);

import { decideDuplicate, duplicateBatch, sharedLinks } from './duplicateCleanup';

const row = (pinId: number, otherPinId: number, status = 'suggested', verdict: string | null = null) => ({ pinId, otherPinId, reason: 'similar', score: 0.9, status, verdict, verdictReasoning: null });
const pin = (id: number) => ({ id, title: `Pin ${id}`, sourceUrl: `https://example.com/${id}`, references: [] });

beforeEach(() => vi.resetAllMocks());

describe('duplicateBatch', () => {
  it('gives a batch with both pins, and sets aside a pair with a deleted pin', async () => {
    api.duplicateRows.mockResolvedValueOnce({ rows: [], total: 0 }).mockResolvedValueOnce({ rows: [row(1, 2), row(3, 4), row(5, 6)], total: 3 });
    api.getPin.mockImplementation(async (id: number) => {
      if (id === 2) throw new api.ApiCallError(404, 'gone');
      return pin(id);
    });
    const batch = await duplicateBatch(1);
    expect(batch.pairs.map((p) => [p.pinId, p.otherPinId])).toEqual([[3, 4]]);
    expect(batch).toMatchObject({ gone: 1, undecided: 2 });
    expect(api.markDuplicate).toHaveBeenCalledWith(1, 2, 'unsure', 'Pin 2 has been deleted.');
  });

  it('knows a link both pins cite', () => {
    expect(sharedLinks({ ...pin(1), references: [{ url: 'https://news.example.com/a' }] }, { ...pin(2), sourceUrl: 'https://news.example.com/a' })).toHaveLength(1);
  });
});

describe('decideDuplicate', () => {
  const reason = 'Both pins mark the same opening on the same day.';

  it('confirms a same pair, lower id first', async () => {
    api.duplicateRows.mockResolvedValueOnce({ rows: [row(1, 2)] }).mockResolvedValueOnce({ rows: [row(1, 2, 'confirmed', 'same')] });
    await expect(decideDuplicate(2, 1, 'same', reason)).resolves.toMatchObject({ status: 'confirmed' });
    expect(api.decideDuplicatePair).toHaveBeenCalledWith(1, 2, 'confirmed');
  });

  it('only records an unsure pair', async () => {
    api.duplicateRows.mockResolvedValueOnce({ rows: [row(1, 2)] }).mockResolvedValueOnce({ rows: [row(1, 2, 'suggested', 'unsure')] });
    await decideDuplicate(1, 2, 'unsure', reason);
    expect(api.decideDuplicatePair).not.toHaveBeenCalled();
  });

  it('never overturns a decided pair, or takes a bare decision', async () => {
    api.duplicateRows.mockResolvedValue({ rows: [row(1, 2, 'rejected')] });
    await expect(decideDuplicate(1, 2, 'same', reason)).rejects.toThrow('already rejected');
    await expect(decideDuplicate(1, 2, 'same', 'yes')).rejects.toThrow('reasoning');
    expect(api.markDuplicate).not.toHaveBeenCalled();
  });
});
