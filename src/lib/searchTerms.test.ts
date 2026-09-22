import { describe, expect, it } from 'vitest';
import { hasTerm, refineQuery, removeTerm, toggleTerm } from './searchTerms';

describe('refineQuery', () => {
  it('adds a quoted term once', () => {
    expect(refineQuery('', 'tag', 'Prediction Market')).toBe('tag:"Prediction Market"');
    expect(refineQuery('tag:Movie', 'tag', 'movie')).toBe('tag:Movie');
  });
});

describe('removeTerm', () => {
  it('removes every form the server accepts, keeping the rest of the query', () => {
    expect(removeTerm('rocket category:"Astronomy" company:NASA', 'category', 'Astronomy')).toBe('rocket company:NASA');
    expect(removeTerm("category:'Astronomy'", 'category', 'Astronomy')).toBe('');
    expect(removeTerm('"category:Astronomy" launch', 'category', 'Astronomy')).toBe('launch');
    expect(removeTerm('CATEGORY:Movie category:movie Movie', 'category', 'Movie')).toBe('Movie');
  });

  it('leaves longer values and other fields alone', () => {
    expect(removeTerm('category:Movie2 company:Movie', 'category', 'Movie')).toBe('category:Movie2 company:Movie');
  });
});

describe('toggleTerm', () => {
  it('adds a missing term and removes a present one', () => {
    const added = toggleTerm('user:GameDesk', 'tag', 'Prediction Market');
    expect(added).toBe('user:GameDesk tag:"Prediction Market"');
    expect(hasTerm(added, 'tag', 'Prediction Market')).toBe(true);
    expect(toggleTerm(added, 'tag', 'Prediction Market')).toBe('user:GameDesk');
  });
});
