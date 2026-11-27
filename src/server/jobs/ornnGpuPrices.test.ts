import { describe, expect, it } from 'vitest';
import { mergePoints } from './ornnGpuPrices';

describe('mergePoints', () => {
  it('keeps older stored days, lets fresh readings win and sorts', () => {
    const stored = [{ x: '2026-08-01', value: 2 }, { x: '2026-08-27', value: 2.8 }];
    const fresh = [{ x: '2026-08-28', value: 2.9 }, { x: '2026-08-27', value: 2.84 }];
    expect(mergePoints(stored, fresh)).toEqual([
      { x: '2026-08-01', value: 2 },
      { x: '2026-08-27', value: 2.84 },
      { x: '2026-08-28', value: 2.9 },
    ]);
  });
});
