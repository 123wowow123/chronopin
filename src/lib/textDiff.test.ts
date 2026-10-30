import { describe, expect, it } from 'vitest';
import { diffCounts, diffWithContext, wordDiff } from './textDiff';

describe('wordDiff', () => {
  it('marks the words a rewrite removed and added', () => {
    expect(wordDiff('Opens on December 8 for all', 'Opens on January 6 for all')).toEqual([
      { op: 'eq', text: 'Opens on ' },
      { op: 'del', text: 'December 8' },
      { op: 'ins', text: 'January 6' },
      { op: 'eq', text: ' for all' },
    ]);
  });

  it('is all equal for identical text and reassembles both sides', () => {
    expect(wordDiff('same words', 'same words')).toEqual([{ op: 'eq', text: 'same words' }]);
    const before = 'one two three four five';
    const after = 'one 2 three five six';
    const diff = wordDiff(before, after);
    expect(diff.filter((s) => s.op !== 'ins').map((s) => s.text).join('')).toBe(before);
    expect(diff.filter((s) => s.op !== 'del').map((s) => s.text).join('')).toBe(after);
  });
});

describe('diffWithContext', () => {
  it('cuts a long unchanged stretch to its edges', () => {
    const filler = Array.from({ length: 60 }, (_, i) => `w${i}`).join(' ');
    const diff = diffWithContext(wordDiff(`a ${filler} b`, `a ${filler} c`));
    expect(diff.at(-2)).toEqual({ op: 'del', text: 'b' });
    // Only the words before the change survive, and the start is trimmed.
    expect(diff[0].text.length).toBeLessThan(filler.length);
    expect(diff[0].text).toMatch(/w59$|w59 $/);
  });
});

describe('diffCounts', () => {
  it('counts words', () => {
    expect(diffCounts([{ op: 'del', text: 'a b' }, { op: 'ins', text: 'c' }, { op: 'eq', text: 'd' }])).toEqual({ added: 1, removed: 2 });
  });
});
