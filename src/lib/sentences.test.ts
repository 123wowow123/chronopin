import { describe, expect, it } from 'vitest';
import { leadSentences, splitSentences } from './sentences';

describe('splitSentences', () => {
  it('splits at the ends of sentences', () => {
    expect(splitSentences('The film opens in May. It stars two actors! Is it good? Yes.')).toEqual([
      'The film opens in May.',
      'It stars two actors!',
      'Is it good?',
      'Yes.',
    ]);
  });

  it('does not split at initials', () => {
    const lead =
      'It is based on the novel by C. S. Lewis. It stars Samuel L. Jackson and Richard E. Grant, directed by J. J. Abrams and J.R.R. Tolkien fans.';
    expect(splitSentences(lead)).toEqual([
      'It is based on the novel by C. S. Lewis.',
      'It stars Samuel L. Jackson and Richard E. Grant, directed by J. J. Abrams and J.R.R. Tolkien fans.',
    ]);
  });

  it('does not split at abbreviations', () => {
    expect(splitSentences('Dr. Robotnik returns to the U.S. on Sept. 18. Filming ends in Mt. Fuji.')).toEqual([
      'Dr. Robotnik returns to the U.S. on Sept. 18.',
      'Filming ends in Mt. Fuji.',
    ]);
  });

  it('keeps a closing quote with its sentence', () => {
    expect(splitSentences('He said "it is done." Then he left.')).toEqual(['He said "it is done."', 'Then he left.']);
  });

  it('squashes whitespace and drops empty input', () => {
    expect(splitSentences('  One.\n\n  Two.  ')).toEqual(['One.', 'Two.']);
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('leadSentences', () => {
  it('keeps as many whole sentences as fit', () => {
    expect(leadSentences('One two. Three four. Five six.', 20)).toBe('One two. Three four.');
  });

  it('cuts one over-long sentence at a word and ellipses it', () => {
    expect(leadSentences('A very long opening sentence that goes on.', 20)).toBe('A very long…');
  });
});
