import { describe, expect, it } from 'vitest';
import { joinSearchQuery, parseSearchQuery, splitSearchQuery } from './searchQuery';

describe('splitSearchQuery', () => {
  it('keeps terms and text in order, with what each was written as', () => {
    expect(splitSearchQuery('iphone company:"Electronic Arts" @ThePinGang Category:software trailer')).toEqual([
      { kind: 'text', raw: 'iphone ' },
      { kind: 'term', field: 'company', value: 'Electronic Arts', raw: 'company:"Electronic Arts"' },
      { kind: 'text', raw: ' ' },
      { kind: 'term', field: 'user', value: '@ThePinGang', raw: '@ThePinGang' },
      { kind: 'text', raw: ' ' },
      { kind: 'term', field: 'category', value: 'software', raw: 'Category:software' },
      { kind: 'text', raw: ' trailer' },
    ]);
  });

  it('reads whole-term quotes and smart quotes', () => {
    expect(splitSearchQuery('"category:Music & Audio" company:“EA”')).toEqual([
      { kind: 'term', field: 'category', value: 'Music & Audio', raw: '"category:Music & Audio"' },
      { kind: 'text', raw: ' ' },
      { kind: 'term', field: 'company', value: 'EA', raw: 'company:"EA"' },
    ]);
  });

  it('leaves an @ inside a word as text', () => {
    expect(splitSearchQuery('mail@example.com')).toEqual([{ kind: 'text', raw: 'mail@example.com' }]);
  });
});

describe('joinSearchQuery', () => {
  it('writes the query back without a removed term', () => {
    const parts = splitSearchQuery('iphone  category:Phones company:Apple');
    expect(joinSearchQuery(parts.filter((part) => !(part.kind === 'term' && part.field === 'category')))).toBe('iphone company:Apple');
  });
});

describe('parseSearchQuery', () => {
  it('matches categories in any case, once each', () => {
    expect(parseSearchQuery('category:software CATEGORY:Software ios')).toEqual({
      userNames: [],
      companies: [],
      categories: ['software'],
      confidences: [],
      text: 'ios',
    });
  });

  it('reads confidence levels, with UNVERIFIED as the stored unknown', () => {
    expect(parseSearchQuery('confidence:ESTIMATED confidence:unverified confidence:estimated').confidences).toEqual(['estimated', 'unknown']);
  });
});
