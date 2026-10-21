import { describe, expect, it } from 'vitest';
import {
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

