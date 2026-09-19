import { describe, expect, it } from 'vitest';
import { commentMood } from './commentMood';

const at = (day: number, sentiment: number | null) => ({ sentiment, utcCreatedDateTime: `2026-09-${String(day).padStart(2, '0')}T12:00:00Z` });

describe('commentMood', () => {
  it('is null until a comment is scored', () => {
    expect(commentMood([])).toBeNull();
    expect(commentMood([at(1, null)])).toBeNull();
  });

  it('reads the average, leaving unscored comments out', () => {
    expect(commentMood([at(1, 0.8), at(2, 0.6), at(3, null)])).toMatchObject({ scored: 2, mood: 'positive', trend: null });
    expect(commentMood([at(1, -0.8), at(2, -0.4)])?.mood).toBe('negative');
    expect(commentMood([at(1, 0.8), at(2, -0.8)])?.mood).toBe('mixed');
  });

  it('compares the newest comments with the older ones, by posting time', () => {
    // Given out of order: the two newest are the negative ones.
    const cooling = [at(5, -0.6), at(1, 0.8), at(2, 0.7), at(6, -0.8), at(3, 0.9), at(4, 0.6)];
    expect(commentMood(cooling)?.trend).toBe('cooling');
    expect(commentMood([at(1, -0.5), at(2, -0.6), at(3, 0.5), at(4, 0.7)])?.trend).toBe('warming');
    expect(commentMood([at(1, 0.5), at(2, 0.4), at(3, 0.5), at(4, 0.45)])?.trend).toBe('steady');
  });
});
