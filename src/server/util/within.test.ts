import { describe, expect, it } from 'vitest';
import { dayBounds, parseSearchQuery, radiusMetres, withinRef } from './searchQuery';

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

  it('reads a radius in km, miles or metres, and ignores nonsense', () => {
    expect(radiusMetres('50km')).toBe(50000);
    expect(radiusMetres('30 mi')).toBe(48280);
    expect(radiusMetres('2000m')).toBe(2000);
    expect(radiusMetres('75')).toBe(75000);
    expect(radiusMetres('0km')).toBeNull();
    expect(radiusMetres('99999km')).toBeNull();
    expect(radiusMetres('far')).toBeNull();
    expect(parseSearchQuery('within:pin:5 radius:10km radius:20km').radiusM).toBe(20000);
    expect(parseSearchQuery('within:pin:5').radiusM).toBeNull();
  });
});

describe('date: a whole month', () => {
  it('is every day of it, including December into the next year', () => {
    expect(dayBounds('2026-10')).toEqual({ days: [], bounds: [{ op: '>=', day: '2026-10-01' }, { op: '<', day: '2026-11-01' }] });
    expect(dayBounds('2026-12').bounds[1]).toEqual({ op: '<', day: '2027-01-01' });
    expect(dayBounds('2026-13')).toEqual({ days: [], bounds: [] });
    expect(parseSearchQuery('date:2026-10').dateBounds).toHaveLength(2);
  });
});
