import { describe, expect, it } from 'vitest';
import { takeName } from '@/lib/savedQueries';
import { expandGroups, parseSearchQuery, wholeGroup } from './searchQuery';

describe('bracket groups', () => {
  it('multiplies a group out into OR alternatives', () => {
    expect(expandGroups('(tag:A OR tag:B) company:X')).toBe('tag:A company:X OR tag:B company:X');
    expect(expandGroups('(tag:A OR (tag:B company:X OR tag:C)) tag:D')).toBe('tag:A tag:D OR tag:B company:X tag:D OR tag:C tag:D');
  });

  it('leaves plain brackets and quoted ones alone', () => {
    expect(expandGroups('iphone (2020) tag:AI')).toBe('iphone (2020) tag:AI');
    expect(expandGroups('place:"New (York)" tag:A')).toBe('place:"New (York)" tag:A');
  });

  it('reads a named group as its terms', () => {
    const q = parseSearchQuery('[Hot](tag:Predicted updated:>=2026-10-17 OR tag:Predicted posted:2026-10-18 tag:Food)');
    expect(q.alternatives).toHaveLength(2);
    expect(q.text).toBe('');
  });

  it('takes the name and unwraps a search that is only a group', () => {
    expect(takeName('[Hot](tag:A OR tag:B)')).toEqual({ query: 'tag:A OR tag:B', name: 'Hot' });
    expect(takeName('[Hot](tag:A OR tag:B) tag:C')).toEqual({ query: '(tag:A OR tag:B) tag:C', name: 'Hot' });
    expect(takeName('[Veo]pin:1,2')).toEqual({ query: 'pin:1,2', name: 'Veo' });
    expect(takeName('tag:A')).toEqual({ query: 'tag:A', name: null });
    expect(wholeGroup('(tag:A OR tag:B) tag:C')).toBeNull();
  });
});
