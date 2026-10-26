import { describe, expect, it } from 'vitest';
import { longitude, natalChart, transitKey, transitsOn } from './transits';

describe('transits', () => {
  it('puts the Sun where the calendar says', () => {
    // The Sun is at 0 degrees Aries at the March equinox, and about 4 Scorpio (214) on 27 Oct.
    expect(longitude('Sun', new Date('2026-03-20T15:00:00Z'))).toBeLessThan(1);
    expect(longitude('Sun', new Date('2026-10-27T12:00:00Z'))).toBeCloseTo(214.2, 0);
  });
  it("finds astro.com's transit for a 15 Dec 1984 chart on 27 Oct 2026: the Sun on natal Pluto", () => {
    const transits = transitsOn(natalChart('1984-12-15'), '2026-10-27', 10);
    expect(transits.some((t) => t.planet === 'Sun' && t.natal === 'Pluto' && t.aspect === 'conjunction')).toBe(true);
  });
  it('keys a set of transits the same whatever its order', () => {
    const a = { planet: 'Sun', aspect: 'trine', natal: 'Mars', orb: 0.2 } as const;
    const b = { planet: 'Mars', aspect: 'square', natal: 'Venus', orb: 0.5 } as const;
    expect(transitKey([a, b])).toBe(transitKey([b, a]));
  });
});

import { Body, Observer, SearchRiseSet } from 'astronomy-engine';
import { ascendant } from './transits';
import { birthMoment } from './birthDetails';

describe('ascendant', () => {
  it('is the Sun at sunrise', () => {
    const observer = new Observer(40.7, -74, 0);
    const rise = SearchRiseSet(Body.Sun, observer, +1, new Date('2026-10-27T00:00:00Z'), 2)!;
    const asc = ascendant(rise.date, 40.7, -74);
    const sun = longitude('Sun', rise.date);
    expect(Math.abs(((asc - sun + 540) % 360) - 180)).toBeLessThan(2);
  });
  it('turns a local birth time into the right instant', () => {
    // New York on 15 Dec 1984 was UTC-5.
    expect(birthMoment('1984-12-15', '08:30', 'America/New_York')?.toISOString()).toBe('1984-12-15T13:30:00.000Z');
    // And in July, UTC-4.
    expect(birthMoment('1984-07-15', '08:30', 'America/New_York')?.toISOString()).toBe('1984-07-15T12:30:00.000Z');
    expect(birthMoment('nope', '08:30', 'America/New_York')).toBeNull();
  });
});
