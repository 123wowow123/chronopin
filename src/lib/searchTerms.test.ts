import { describe, expect, it } from 'vitest';
import { hasTerm, pinMarkerLabels, refineQuery, removeTerm, toggleTerm } from './searchTerms';
import { parseSearchQuery } from '@/server/util/searchQuery';

describe('refineQuery', () => {
  it('adds a quoted term once', () => {
    expect(refineQuery('', 'tag', 'Prediction Market')).toBe('tag:"Prediction Market"');
    expect(refineQuery('tag:Movie', 'tag', 'movie')).toBe('tag:Movie');
  });

  it('writes a ticker bare with its $, once whatever the case', () => {
    expect(refineQuery('results', 'ticker', 'nke')).toBe('results $NKE');
    expect(refineQuery('$nke results', 'ticker', 'NKE')).toBe('$nke results');
    expect(removeTerm('$NKE results $ORCL', 'ticker', 'nke')).toBe('results $ORCL');
  });

  it('replaces the rating bounds already there with the one clicked', () => {
    expect(refineQuery('tag:Anime', 'rating', '>=81')).toBe('tag:Anime rating:>=81');
    expect(refineQuery('rating:>90 tag:Anime "rating:<95"', 'rating', '>=81')).toBe('tag:Anime rating:>=81');
  });

  it('replaces the delay bounds already there with the one clicked, leaving the rating alone', () => {
    expect(refineQuery('tag:Retail', 'delay', '>=2months')).toBe('tag:Retail delay:>=2months');
    expect(refineQuery('delay:<1year rating:>80 "delay:>3weeks"', 'delay', '>=2months')).toBe('rating:>80 delay:>=2months');
  });
});

describe('rubric year pill', () => {
  it('adds the year beside the axis the search already has, once', () => {
    expect(refineQuery('', 'rubric', '2026')).toBe('rubric:2026');
    expect(refineQuery('carperf:range', 'rubric', '2026')).toBe('carperf:range rubric:2026');
    expect(refineQuery('carperf:range rubric:2026', 'rubric', '2026')).toBe('carperf:range rubric:2026');
    expect(toggleTerm('carperf:range rubric:2026', 'rubric', '2026')).toBe('carperf:range');
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

describe('pin marker labels', () => {
  it('reads labels from pin: terms and the search still matches the ids', () => {
    const q = 'pin:5711=1,5712=2,5713 tag:Sports';
    expect([...pinMarkerLabels(q)]).toEqual([[5711, '1'], [5712, '2']]);
    expect(parseSearchQuery(q).ids).toEqual([5711, 5712, 5713]);
  });
  it('ignores labels that are too long or not alphanumeric', () => {
    expect(pinMarkerLabels('pin:1=12345,2=<b>,3=A1').size).toBe(1);
  });
});
