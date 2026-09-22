import { describe, expect, it } from 'vitest';
import { nearLinkParams, resolveNear } from './nearFilter';
import { HttpError } from './httpError';

describe('resolveNear', () => {
  it('reads a point and a radius into a ring the queries can use', () => {
    const ring = resolveNear({ near: '34.05,-118.24', within: '100km' })!;
    expect(ring.latitude).toBe(34.05);
    expect(ring.longitude).toBe(-118.24);
    expect(ring.point).toBe('SRID=4326;POINT(-118.24 34.05)');
    expect(ring.meters).toBe(100_000);
  });

  it('takes the radius in whichever unit the reader set it in', () => {
    expect(resolveNear({ near: '0,0', within: '50mi' })!.meters).toBeCloseTo(80_467.2, 1);
    // No reader here to guess a unit for, so a bare number is kilometres.
    expect(resolveNear({ near: '0,0', within: '50' })!.meters).toBe(50_000);
  });

  it('asks for no ring at all when either half is missing', () => {
    // The page's own URL carries the radius alone: only the browser knows
    // where the viewer is, so a request without the point wants no ring.
    expect(resolveNear({ within: '100km' })).toBeNull();
    expect(resolveNear({ near: '34.05,-118.24' })).toBeNull();
    expect(resolveNear({ near: '', within: '' })).toBeNull();
    expect(resolveNear(null)).toBeNull();
  });

  it('refuses a point off the map rather than quietly dropping the filter', () => {
    for (const near of ['here', '34.05', '91,0', '0,181', 'NaN,0']) {
      expect(() => resolveNear({ near, within: '100km' })).toThrow(HttpError);
    }
  });

  it('refuses a radius it cannot make sense of', () => {
    for (const within of ['soon', '0km', '-5km', '30000km']) {
      expect(() => resolveNear({ near: '0,0', within })).toThrow(HttpError);
    }
  });
});

describe('nearLinkParams', () => {
  it('echoes the ring so later pages measure from the same place', () => {
    const ring = resolveNear({ near: '34.05,-118.24', within: '50mi' })!;
    const carried = nearLinkParams(ring)!;
    expect(carried.near).toBe('34.05,-118.24');
    // Written back in kilometres with the unit spelled out, so the next page
    // resolves the very same ring.
    expect(resolveNear(carried)!.meters).toBeCloseTo(ring.meters, 6);
  });

  it('carries nothing when there is no ring', () => {
    expect(nearLinkParams(null)).toBeNull();
  });
});
