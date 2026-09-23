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
    expect(splitSearchQuery('"tag:Prediction Market" company:“EA”')).toEqual([
      { kind: 'term', field: 'tag', value: 'Prediction Market', raw: '"tag:Prediction Market"' },
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
      confidenceBands: [],
      dates: [],
      postedDays: [],
      tags: ['software'],
      excludeTags: [],
      places: [],
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

  it('reads score bands beside the levels, once each, on the same field', () => {
    expect(parseSearchQuery('confidence:LOW confidence:low confidence:high confidence:estimated')).toMatchObject({
      confidenceBands: ['low', 'high'],
      confidences: ['estimated'],
      text: '',
    });
    expect(hasFilters(parseSearchQuery('confidence:medium'))).toBe(true);
  });

  it('reads places - a city, a state, a postal code - quoted like any value, once each', () => {
    expect(parseSearchQuery('place:Chicago place:"New York" PLACE:chicago place:60601 fire')).toMatchObject({
      places: ['Chicago', 'New York', '60601'],
      text: 'fire',
    });
    expect(hasFilters(parseSearchQuery('place:Texas'))).toBe(true);
  });
});

describe('wordStartPattern', () => {
  it('matches the text at the start of any word, taken literally', () => {
    const matches = (text: string, name: string) => new RegExp(wordStartPattern(text).replace('[:alnum:]', 'a-z0-9'), 'i').test(name);
    expect(matches('ast', 'Deep Space Astronomy')).toBe(true);
    expect(matches('pace', 'Deep Space Astronomy')).toBe(false);
    expect(matches('c++', 'C++ Conference')).toBe(true);
    expect(wordStartPattern(' a.b ')).toBe('(^|[^[:alnum:]])a\\.b');
  });
});

describe('excluded tags (-tag:)', () => {
  it('reads -tag: and -category: as tags to leave out, in every quoting', () => {
    const q = parseSearchQuery('anime -tag:Music -tag:"Grammy Awards" "-tag:Sports" -category:Movies tag:Japan');
    expect(q.excludeTags).toEqual(['Music', 'Grammy Awards', 'Sports', 'Movies']);
    expect(q.tags).toEqual(['Japan']);
    expect(q.text).toBe('anime');
  });

  it('is a filter on its own, so "everything but" searches', () => {
    expect(hasFilters(parseSearchQuery('-tag:Anime'))).toBe(true);
  });

  it('leaves out a negated field it does not read, rather than matching it', () => {
    const q = parseSearchQuery('-company:Apple -user:someone iphone');
    expect(q.companies).toEqual([]);
    expect(q.userNames).toEqual([]);
    expect(q.text).toBe('iphone');
  });

  it('keeps a hyphenated word as text, and marks the term in the split', () => {
    expect(parseSearchQuery('t-tag:x').text).toBe('t-tag:x');
    expect(splitSearchQuery('-tag:Anime')).toEqual([{ kind: 'term', field: 'tag', value: 'Anime', raw: '-tag:Anime', negated: true }]);
  });
});
