import { describe, expect, it } from 'vitest';
import { canonicalCategory, hasCategory, isCategory, parseCategories } from './categories';

describe('canonicalCategory', () => {
  it("gives the list's spelling, or the value when it is not on the list", () => {
    expect(canonicalCategory('tv series')).toBe('TV Series');
    expect(canonicalCategory('Deep Sea')).toBe('Deep Sea');
  });
});

describe('isCategory', () => {
  it('knows the list in any case', () => {
    expect(isCategory('anime')).toBe(true);
    expect(isCategory(' AI Models ')).toBe(true);
    expect(isCategory('Studio Ghibli')).toBe(false);
    expect(isCategory(null)).toBe(false);
  });
});

describe('hasCategory', () => {
  it('matches any of the wanted ones in any case', () => {
    expect(hasCategory(['Music & Audio', 'anime'], ['Anime', 'Movies'])).toBe(true);
    expect(hasCategory(['Software'], ['Anime'])).toBe(false);
    expect(hasCategory(undefined, ['Anime'])).toBe(false);
  });
});

describe('parseCategories', () => {
  it('reads a list, a comma-separated string or the old single field', () => {
    expect(parseCategories(['anime', 'Anime', 'Studio Ghibli', 'tv series'])).toEqual(['Anime', 'TV Series']);
    expect(parseCategories('Software, AI Models')).toEqual(['Software', 'AI Models']);
    expect(parseCategories('Movies')).toEqual(['Movies']);
    expect(parseCategories(undefined)).toBeUndefined();
    expect(parseCategories(null)).toBeUndefined();
  });
});
