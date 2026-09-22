import { describe, expect, it } from 'vitest';
import { canonicalCategory, hasCategory, isCategory, parseCategories } from './categories';

describe('canonicalCategory', () => {
  it("gives the list's spelling, or the value when it is not on the list", () => {
    expect(canonicalCategory('tv')).toBe('TV');
    expect(canonicalCategory('Deep Sea')).toBe('Deep Sea');
  });
});

describe('isCategory', () => {
  it('knows the list in any case', () => {
    expect(isCategory('anime')).toBe(true);
    expect(isCategory(' AI ')).toBe(true);
    expect(isCategory('Studio Ghibli')).toBe(false);
    expect(isCategory(null)).toBe(false);
  });
});

describe('hasCategory', () => {
  it('matches any of the wanted ones in any case', () => {
    expect(hasCategory(['Audio', 'anime'], ['Anime', 'Movie'])).toBe(true);
    expect(hasCategory(['Software'], ['Anime'])).toBe(false);
    expect(hasCategory(undefined, ['Anime'])).toBe(false);
  });
});

describe('parseCategories', () => {
  it('reads a list, a comma-separated string or the old single field', () => {
    expect(parseCategories(['anime', 'Anime', 'Studio Ghibli', 'tv'])).toEqual(['Anime', 'TV']);
    expect(parseCategories('Software, AI')).toEqual(['Software', 'AI']);
    expect(parseCategories('Movie')).toEqual(['Movie']);
    expect(parseCategories(undefined)).toBeUndefined();
    expect(parseCategories(null)).toBeUndefined();
  });
});
