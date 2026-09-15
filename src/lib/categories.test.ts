import { describe, expect, it } from 'vitest';
import { canonicalCategory, categoryOptions } from './categories';

describe('categoryOptions', () => {
  it('lists only categories with pins, busiest first, in the list spelling', () => {
    expect(categoryOptions({ movies: 4, 'music & audio': 12, software: 0, '': 3, sports: 4 })).toEqual([
      { name: 'Music & Audio', count: 12 },
      { name: 'Movies', count: 4 },
      { name: 'Sports', count: 4 },
    ]);
  });

  it('keeps picked categories with no pins, and categories off the list', () => {
    expect(categoryOptions({ 'deep sea': 2 }, ['marine', 'Deep Sea'])).toEqual([
      { name: 'deep sea', count: 2 },
      { name: 'Marine', count: 0 },
    ]);
  });
});

describe('canonicalCategory', () => {
  it('matches the list in any case', () => {
    expect(canonicalCategory('tv series')).toBe('TV Series');
    expect(canonicalCategory('Deep Sea')).toBe('Deep Sea');
  });
});
