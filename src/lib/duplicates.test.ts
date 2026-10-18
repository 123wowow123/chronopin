import { describe, expect, it } from 'vitest';
import { compareDuplicateRank, stackDuplicates } from './duplicates';

const pin = (id: number, extra: Record<string, unknown> = {}) => ({
  id,
  utcCreatedDateTime: `2026-09-${String(id).padStart(2, '0')}T00:00:00.000Z`,
  ...extra,
});

describe('compareDuplicateRank', () => {
  it('ranks by watches, then views, then likes, then the first posted', () => {
    const ranked = [
      pin(1, { favoriteCount: 0, viewCount: 9 }),
      pin(2, { favoriteCount: 1, viewCount: 0 }),
      pin(3, { favoriteCount: 0, viewCount: 9, likeCount: 2 }),
      pin(4, { favoriteCount: 0, viewCount: 1 }),
      pin(5),
    ].sort(compareDuplicateRank);
    expect(ranked.map((p) => p.id)).toEqual([2, 3, 1, 4, 5]);
  });
});

describe('stackDuplicates', () => {
  it('leaves pins without duplicates as they are', () => {
    const pins = [pin(1), pin(2)];
    expect(stackDuplicates(pins)).toEqual([
      { pin: pins[0], hidden: [] },
      { pin: pins[1], hidden: [] },
    ]);
  });

  it('puts the top-ranked member where it stands and hides the rest behind it', () => {
    const a = pin(1, { duplicateGroup: [1, 3, 4] });
    const b = pin(2);
    const c = pin(3, { duplicateGroup: [1, 3, 4], favoriteCount: 2 });
    const d = pin(4, { duplicateGroup: [1, 3, 4], viewCount: 5 });
    const stacks = stackDuplicates([a, b, c, d]);
    expect(stacks.map((s) => [s.pin.id, s.hidden.map((h) => h.id)])).toEqual([
      [2, []],
      [3, [4, 1]],
    ]);
  });

  it('shows a pin alone when its duplicates are not among these pins', () => {
    const a = pin(5, { duplicateGroup: [5, 9] });
    expect(stackDuplicates([a])).toEqual([{ pin: a, hidden: [] }]);
  });
});
