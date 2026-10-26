import { describe, expect, it } from 'vitest';
import { TagCountBusy, withTagCountSlot, TAG_COUNT_SLOTS } from './tagCountGate';

const later = () => new Promise<void>((r) => setTimeout(r, 0));

describe('withTagCountSlot', () => {
  it('refuses while the server is shedding', async () => {
    await expect(withTagCountSlot(async () => 1, true)).rejects.toBeInstanceOf(TagCountBusy);
  });
  it('runs at most TAG_COUNT_SLOTS at once and passes the rest on in turn', async () => {
    let running = 0;
    let peak = 0;
    const job = async () => {
      running++;
      peak = Math.max(peak, running);
      await later();
      running--;
      return 'ok';
    };
    const results = await Promise.all(Array.from({ length: TAG_COUNT_SLOTS * 3 }, () => withTagCountSlot(job, false)));
    expect(results.every((r) => r === 'ok')).toBe(true);
    expect(peak).toBe(TAG_COUNT_SLOTS);
    // The slots are all free again.
    expect(await withTagCountSlot(async () => 'free', false)).toBe('free');
  });
  it('frees the slot when the work throws', async () => {
    for (let i = 0; i < TAG_COUNT_SLOTS * 2; i++) await expect(withTagCountSlot(async () => { throw new Error('x'); }, false)).rejects.toThrow('x');
    expect(await withTagCountSlot(async () => 'free', false)).toBe('free');
  });
});
