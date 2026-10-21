import { describe, expect, it } from 'vitest';
import { SITE_KINDS, SITE_STYLE, epochKind, roundCoords } from './siteShape';

describe('epochKind', () => {
  it("reads Epoch AI's annotation types as site kinds, in any case", () => {
    expect(epochKind('Building')).toBe('building');
    expect(epochKind('Cooling')).toBe('cooling');
    expect(epochKind('Backup generator')).toBe('generator');
    expect(epochKind('Power substation')).toBe('substation');
    expect(epochKind('Power generator')).toBe('power');
    expect(epochKind('BUILDING')).toBe('building');
  });
  it('leaves out a type it does not know', () => {
    expect(epochKind('Parking lot')).toBeNull();
    expect(epochKind(undefined)).toBeNull();
  });
});

describe('roundCoords', () => {
  it('rounds nested coordinates to six decimals', () => {
    expect(roundCoords([[[-90.0967254321, 32.5922181234]]])).toEqual([[[-90.096725, 32.592218]]]);
  });
});

describe('SITE_STYLE', () => {
  it('styles every kind the map draws', () => {
    for (const kind of SITE_KINDS) expect(SITE_STYLE[kind].color).toMatch(/^#[0-9a-f]{6}$/);
    expect(SITE_KINDS[0]).toBe('site');
  });
});

