import { describe, expect, it } from 'vitest';
import { MAX_RADIUS_KM, nearestRadiusIndex, parseRadius, radiusFromParam, radiusLabel, radiusSteps, radiusToParam } from './radius';

const KM_STEPS = radiusSteps(false);
const MI_STEPS = radiusSteps(true);

describe('radiusSteps', () => {
  it('offers round numbers in the reader’s own unit', () => {
    expect(KM_STEPS[0]).toBe(10);
    // 5 miles, so the label reads "5 mi" rather than "8 km" converted.
    expect(radiusLabel(MI_STEPS[0], true)).toBe('5 mi');
    expect(radiusLabel(KM_STEPS[0], false)).toBe('10 km');
  });
});

describe('radiusLabel', () => {
  it('says "All" for no ring at all', () => {
    expect(radiusLabel(null, false)).toBe('All');
    expect(radiusLabel(null, true)).toBe('All');
  });

  it('converts for a reader in miles', () => {
    expect(radiusLabel(100, false)).toBe('100 km');
    expect(radiusLabel(160.9344, true)).toBe('100 mi');
  });
});

describe('parseRadius', () => {
  it('reads a bare number in the reader’s own unit', () => {
    expect(parseRadius('50', false)).toBe(50);
    expect(parseRadius('50', true)).toBeCloseTo(80.4672, 4);
  });

  it('reads the unit when one is written, whatever the reader uses', () => {
    expect(parseRadius('50 km', true)).toBe(50);
    expect(parseRadius('50km', true)).toBe(50);
    expect(parseRadius('30 miles', false)).toBeCloseTo(48.28, 2);
    expect(parseRadius('30mi', false)).toBeCloseTo(48.28, 2);
    expect(parseRadius('100 kilometres', false)).toBe(100);
  });

  it('refuses what it cannot make sense of', () => {
    expect(parseRadius('', false)).toBeNull();
    expect(parseRadius('near', false)).toBeNull();
    expect(parseRadius('0', false)).toBeNull();
    expect(parseRadius('-5', false)).toBeNull();
    expect(parseRadius('50 parsecs', false)).toBeNull();
  });

  it('refuses a ring wider than the world', () => {
    expect(parseRadius(`${MAX_RADIUS_KM}`, false)).toBe(MAX_RADIUS_KM);
    expect(parseRadius(`${MAX_RADIUS_KM + 1}`, false)).toBeNull();
  });
});

describe('radiusToParam', () => {
  it('writes the ring in the unit it was set in', () => {
    expect(radiusToParam(50, false)).toBe('50km');
    expect(radiusToParam(160.9344, true)).toBe('100mi');
    expect(radiusToParam(null, false)).toBeNull();
  });

  it('round-trips a step of either ladder', () => {
    for (const km of KM_STEPS) expect(radiusFromParam(radiusToParam(km, false), false)).toBeCloseTo(km, 6);
    for (const km of MI_STEPS) expect(radiusFromParam(radiusToParam(km, true), true)).toBeCloseTo(km, 6);
  });

  it('means the same ring to a reader who uses the other unit', () => {
    // A link written in miles reopens as the very same distance in kilometres.
    expect(radiusFromParam(radiusToParam(MI_STEPS[3], true), false)).toBeCloseTo(MI_STEPS[3], 6);
  });
});

describe('nearestRadiusIndex', () => {
  it('puts no ring at all past the last step', () => {
    expect(nearestRadiusIndex(null, KM_STEPS)).toBe(KM_STEPS.length);
  });

  it('lands a step on itself', () => {
    KM_STEPS.forEach((km, index) => expect(nearestRadiusIndex(km, KM_STEPS)).toBe(index));
  });

  it('puts a typed radius on the nearest step by ratio, not by difference', () => {
    // 40 km is 15 from 25 and 10 from 50, and nearer 50 either way.
    expect(KM_STEPS[nearestRadiusIndex(40, KM_STEPS)]).toBe(50);
    // 30 km is 5 above 25 and 20 below 50, and nearer 25 on a log scale too:
    // the steps are read as ratios, which is how the slider spaces them.
    expect(KM_STEPS[nearestRadiusIndex(30, KM_STEPS)]).toBe(25);
    expect(KM_STEPS[nearestRadiusIndex(1, KM_STEPS)]).toBe(10);
    expect(KM_STEPS[nearestRadiusIndex(9000, KM_STEPS)]).toBe(2500);
  });
});
