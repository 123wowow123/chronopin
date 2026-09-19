import { describe, expect, it } from 'vitest';
import { DEFAULT_WIKI_RECHECK, parseWikiRecheck, recheckOff } from './wikiRecheck';

describe('parseWikiRecheck', () => {
  it('defaults to no age limit, re-reading viewed pins', () => {
    expect(DEFAULT_WIKI_RECHECK).toEqual({ days: null, viewed: true });
    expect(parseWikiRecheck({ days: null })).toEqual({ setting: { days: null, viewed: true } });
  });

  it('reads a row saved as onlyViewed', () => {
    expect(parseWikiRecheck({ days: 30, onlyViewed: false })).toEqual({ setting: { days: 30, viewed: false } });
  });

  it('takes whole days in range', () => {
    expect(parseWikiRecheck({ days: 30, viewed: false })).toEqual({ setting: { days: 30, viewed: false } });
    for (const days of [0, -1, 1.5, 3651, '30', undefined]) {
      expect(parseWikiRecheck({ days })).toHaveProperty('problem');
    }
    expect(parseWikiRecheck({ days: 7, viewed: 'yes' })).toHaveProperty('problem');
    expect(parseWikiRecheck(null)).toHaveProperty('problem');
  });
});

describe('recheckOff', () => {
  it('is off only when both options are', () => {
    expect(recheckOff({ days: null, viewed: false })).toBe(true);
    expect(recheckOff({ days: 30, viewed: true })).toBe(false);
    expect(recheckOff({ days: null, viewed: true })).toBe(false);
    expect(recheckOff({ days: 30, viewed: false })).toBe(false);
  });
});
