import { describe, expect, it } from 'vitest';
import { hasFilters, joinSearchQuery, parseSearchQuery, splitSearchQuery, wordStartPattern } from './searchQuery';

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
  it('reads the old category: terms as tags, in any case, once each', () => {
    expect(parseSearchQuery('category:software CATEGORY:Software tag:Software ios')).toEqual({
      userNames: [],
      ids: [],
      companies: [],
      confidences: [],
      dates: [],
      postedDays: [],
      tags: ['software'],
      text: 'ios',
    });
  });

  it('reads tags, quoted like any value, once each whatever the case', () => {
    expect(parseSearchQuery('tag:"Tokyo Anime Award Festival 2024" tag:Artemis TAG:artemis moon')).toMatchObject({
      tags: ['Tokyo Anime Award Festival 2024', 'Artemis'],
      text: 'moon',
    });
    expect(hasFilters(parseSearchQuery('tag:Artemis'))).toBe(true);
  });

  it('reads days, BC ones too, and leaves out anything else', () => {
    expect(parseSearchQuery('date:2026-09-08 date:-2560-01-01 date:2026-09-08 date:tomorrow').dates).toEqual(['2026-09-08', '-2560-01-01']);
    expect(parseSearchQuery('posted:2026-09-13 date:2026-09-08')).toMatchObject({ dates: ['2026-09-08'], postedDays: ['2026-09-13'] });
  });

  it('reads pin ids, comma-separated, once each and never anything else', () => {
    expect(parseSearchQuery('pin:1992,1991 pin:1992 pin:none pin:-3').ids).toEqual([1992, 1991]);
    expect(hasFilters(parseSearchQuery('pin:1992'))).toBe(true);
  });

  it('reads confidence levels, with UNVERIFIED as the stored unknown', () => {
    expect(parseSearchQuery('confidence:ESTIMATED confidence:unverified confidence:estimated').confidences).toEqual(['estimated', 'unknown']);
  });
});

describe('wordStartPattern', () => {
  it('matches the text at the start of any word, taken literally', () => {
    const matches = (text: string, name: string) => new RegExp(wordStartPattern(text).replace('[:alnum:]', 'a-z0-9'), 'i').test(name);
    expect(matches('ast', 'Space & Astronomy')).toBe(true);
    expect(matches('pace', 'Space & Astronomy')).toBe(false);
    expect(matches('c++', 'C++ Conference')).toBe(true);
    expect(wordStartPattern(' a.b ')).toBe('(^|[^[:alnum:]])a\\.b');
  });
});
