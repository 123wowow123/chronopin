import { describe, expect, it } from 'vitest';
import { hasTerm, refineQuery, removeTerm, toggleTerm } from './searchTerms';

describe('refineQuery', () => {
  it('adds a quoted term once', () => {
    expect(refineQuery('', 'category', 'Space & Astronomy')).toBe('category:"Space & Astronomy"');
    expect(refineQuery('category:Movies', 'category', 'movies')).toBe('category:Movies');
  });
});

describe('removeTerm', () => {
  it('removes every form the server accepts, keeping the rest of the query', () => {
    expect(removeTerm('rocket category:"Space & Astronomy" company:NASA', 'category', 'Space & Astronomy')).toBe('rocket company:NASA');
    expect(removeTerm("category:'Space & Astronomy'", 'category', 'Space & Astronomy')).toBe('');
    expect(removeTerm('"category:Space & Astronomy" launch', 'category', 'Space & Astronomy')).toBe('launch');
    expect(removeTerm('CATEGORY:Movies category:movies Movies', 'category', 'Movies')).toBe('Movies');
  });

  it('leaves longer values and other fields alone', () => {
    expect(removeTerm('category:Movies2 company:Movies', 'category', 'Movies')).toBe('category:Movies2 company:Movies');
  });
});

describe('toggleTerm', () => {
  it('adds a missing term and removes a present one', () => {
    const added = toggleTerm('user:GameDesk', 'category', 'Gaming & Entertainment');
    expect(added).toBe('user:GameDesk category:"Gaming & Entertainment"');
    expect(hasTerm(added, 'category', 'Gaming & Entertainment')).toBe(true);
    expect(toggleTerm(added, 'category', 'Gaming & Entertainment')).toBe('user:GameDesk');
  });
});
