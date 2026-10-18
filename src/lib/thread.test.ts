import { describe, expect, it } from 'vitest';
import { branchesUnder, threadNumbers } from './thread';

const pin = (id: number, parentId?: number) => ({ id, parentId });

describe('branchesUnder', () => {
  it('is false for a plain chain, from any pin in it', () => {
    const chain = [pin(1), pin(2, 1), pin(3, 2), pin(4, 3)];
    expect(branchesUnder(chain, 1)).toBe(false);
    expect(branchesUnder(chain, 4)).toBe(false);
  });

  it('is true at a pin with several responses and above it', () => {
    const tree = [pin(1), pin(2, 1), pin(3, 2), pin(4, 2)];
    expect(branchesUnder(tree, 2)).toBe(true);
    expect(branchesUnder(tree, 1)).toBe(true);
  });

  it('is false below the fork and on its sibling branches', () => {
    const tree = [pin(1), pin(2, 1), pin(3, 1), pin(4, 3)];
    expect(branchesUnder(tree, 2)).toBe(false);
    expect(branchesUnder(tree, 3)).toBe(false);
    expect(branchesUnder(tree, 1)).toBe(true);
  });

  it('ends on a parent cycle', () => {
    expect(branchesUnder([pin(1, 2), pin(2, 1)], 1)).toBe(false);
  });
});

describe('threadNumbers', () => {
  it('counts a chain up from 1', () => {
    const chain = [pin(1), pin(2, 1), pin(3, 2)];
    expect([...threadNumbers(chain).values()]).toEqual([1, 2, 3]);
  });

  it('starts each branch again at 1', () => {
    // 1 -> 2 -> (3 -> 4 -> 5) and (6 -> 7), as the pane lists them
    const tree = [pin(1), pin(2, 1), pin(3, 2), pin(4, 3), pin(5, 4), pin(6, 2), pin(7, 6)];
    expect([...threadNumbers(tree).values()]).toEqual([1, 2, 1, 2, 3, 1, 2]);
  });

  it('keeps a branch of one pin at 1 and continues a chain after it ends', () => {
    const tree = [pin(1), pin(2, 1), pin(3, 1), pin(4, 3)];
    expect([...threadNumbers(tree).values()]).toEqual([1, 1, 1, 2]);
  });
});
