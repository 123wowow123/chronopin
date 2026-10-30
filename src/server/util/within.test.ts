import { describe, expect, it } from 'vitest';
import { parseSearchQuery, withinRef } from './searchQuery';

describe('within:', () => {
  it('reads a member of Congress by slug or name', () => {
    expect(parseSearchQuery('within:person:susan-collins').within).toEqual(['person:susan-collins']);
    expect(parseSearchQuery('within:"person:Susan Collins"').within).toEqual(['person:susan-collins']);
  });
  it('reads a pin by id', () => {
    expect(parseSearchQuery('within:pin:20624 tag:News').within).toEqual(['pin:20624']);
  });
  it('leaves out what is not an area, and keeps other terms', () => {
    expect(parseSearchQuery('within:pin:abc').within).toEqual([]);
    expect(parseSearchQuery('within:city:Paris').within).toEqual([]);
    expect(parseSearchQuery('within:person:susan-collins tag:Restaurants').tags).toEqual(['Restaurants']);
  });
  it('counts as a term, so a search made only of it still runs', () => {
    expect(withinRef('pin:7')).toBe('pin:7');
    expect(withinRef('person:')).toBeNull();
  });
});
