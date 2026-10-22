import { describe, expect, it } from 'vitest';
import {
  coolingSegments,
  normalizeCooling,
  normalizePowerSource,
  datacenterSearchPills,
  powerSourceSegments,
  estimateHomesEquivalentFromMw,
  estimateWaterGallonsPerDayFromMw,
  formatAcres,
  formatChips,
  formatSqft,
  formatWaterGallonsPerDay,
} from './datacenter';

describe('datacenter formatting and estimation', () => {
  it('formats water gallons per day across gal/d, K gal/d, and M gal/d scales', () => {
    expect(formatWaterGallonsPerDay(500)).toBe('500 gal/d');
    expect(formatWaterGallonsPerDay(450_000)).toBe('450K gal/d');
    expect(formatWaterGallonsPerDay(1_500_000)).toBe('1.5M gal/d');
    expect(formatWaterGallonsPerDay(18_000_000)).toBe('18M gal/d');
  });

  it('formats AI chip counts and optional chip model names', () => {
    expect(formatChips(100_000, 'NVIDIA H100')).toBe('100K NVIDIA H100');
    expect(formatChips(550_000)).toBe('550K');
    expect(formatChips(1_110_000)).toBe('1.11M');
  });

  it('formats acreage and facility square footage', () => {
    expect(formatAcres(1200)).toBe('1,200 ac');
    expect(formatSqft(2_200_000)).toBe('2.2M sq ft');
    expect(formatSqft(450_000)).toBe('450K sq ft');
  });

  it('estimates daily water usage and US homes equivalent from MW capacity', () => {
    expect(estimateWaterGallonsPerDayFromMw(100)).toBe(119828);
    expect(estimateHomesEquivalentFromMw(100)).toBe(35040);
  });
});


describe('datacenterSearchPills', () => {
  it('searches the range around each figure rounded to the nearest 50', () => {
    const pills = datacenterSearchPills(
      { waterGallonsPerDay: 179_700, chips: null, h100Equivalents: null, acres: null, sqft: null, generators: 356 },
      { megawatts: 150 },
      { gwh: 788.4 },
    );
    expect(pills.power[0].q).toBe('mw:125-175mw');
    expect(pills.water[0].q).toBe('water:175-225k');
    expect(pills.energy[0].q).toBe('energy:775-825gwh');
    expect(pills.generators[0].q).toBe('generators:325-375');
    expect(pills.chips).toEqual([]);
  });
});

describe('keyword segments', () => {
  it('links cooling types and power sources to searches', () => {
    expect(coolingSegments('Direct-to-chip liquid cooling').filter((x) => x.q).map((x) => x.q)).toEqual(['cooling:"direct-to-chip"', 'cooling:"liquid"']);
    expect(powerSourceSegments('PJM Interconnection / Pennsylvania Grid').filter((x) => x.q).map((x) => x.q)).toEqual(['powersource:"pjm"']);
    expect(powerSourceSegments('Utility grid').map((x) => x.q)).toEqual(['powersource:"utility grid"']);
    expect(coolingSegments('Direct-to-chip liquid cooling').map((x) => x.text).join('')).toBe('Direct-to-chip liquid cooling');
  });
});

describe('tracker text normalising', () => {
  it('spells out bare cooling and power words and leaves the rest', () => {
    expect(normalizeCooling('closed')).toBe('Closed-loop cooling');
    expect(normalizeCooling('closed · water')).toBe('Closed-loop water cooling');
    expect(normalizeCooling('water')).toBe('Water cooling');
    expect(normalizeCooling('Direct-to-chip liquid cooling')).toBe('Direct-to-chip liquid cooling');
    expect(normalizeCooling('')).toBeNull();
    expect(normalizePowerSource('gas, grid')).toBe('Natural gas, Utility grid');
    expect(normalizePowerSource('BTM: ')).toBe('Behind-the-meter (generation not named)');
    expect(normalizePowerSource('BTM: EW Brown Generating Station')).toBe('Behind-the-meter: EW Brown Generating Station');
    expect(normalizePowerSource('Applied Digital')).toBe('Applied Digital');
    expect(normalizePowerSource('')).toBeNull();
  });
});
