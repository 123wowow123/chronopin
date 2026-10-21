import { describe, expect, it } from 'vitest';
import { mapStats } from './mapStats';
import type { MapPinJson } from './types';

const pin = (over: Partial<MapPinJson>): MapPinJson => ({ id: 1, title: 't', utcStartDateTime: '2026-01-01T00:00:00Z', ...over }) as MapPinJson;

describe('mapStats', () => {
  it('counts pins and sums USD cost and MW', () => {
    const stats = mapStats([pin({ price: 1e9, priceCurrency: 'USD', megawatts: 500, powerKind: 'generation' }), pin({ price: 2e9, priceCurrency: 'USD', megawatts: 1000, powerKind: 'usage' }), pin({ price: 5, priceCurrency: 'EUR' })]);
    expect(stats.map((s) => [s.key, s.value])).toEqual([['pins', '3'], ['cost', '$3B'], ['mwGen', '500 MW'], ['mwUse', '1 GW']]);
  });
  it('sums datacenter water usage, chips, acres, sq ft, and generators on the HUD', () => {
    const stats = mapStats([
      pin({ price: 10e9, priceCurrency: 'USD', megawatts: 946, powerKind: 'usage', waterGallonsPerDay: 948_000, chips: 1_111_673, acres: 500, sqft: 2_000_000, generators: 50 }),
      pin({ price: 20e9, priceCurrency: 'USD', megawatts: 1054, powerKind: 'usage', waterGallonsPerDay: 21_052_000, chips: 888_327, acres: 1500, sqft: 3_000_000, generators: 150 }),
    ]);
    expect(stats.map((s) => [s.key, s.value])).toEqual([
      ['pins', '2'],
      ['cost', '$30B'],
      ['mwUse', '2 GW'],
      ['water', '22M gal/d'],
      ['chips', '2M'],
      ['acres', '2,000 ac'],
      ['sqft', '5M sq ft'],
      ['generators', '200'],
    ]);
  });
  it('says the median when one outlier dominates the sum', () => {
    const stats = mapStats([pin({ price: 1e6, priceCurrency: 'USD' }), pin({ price: 2e6, priceCurrency: 'USD' }), pin({ price: 9e12, priceCurrency: 'USD' })]);
    expect(stats.find((s) => s.key === 'cost')?.labelKey).toBe('statMedianCost');
  });
  it('shows episodes and rating only once five pins carry them', () => {
    const few = mapStats(Array.from({ length: 4 }, () => pin({ episodeCount: 12, ratingPercent: 80 })));
    expect(few.map((s) => s.key)).toEqual(['pins']);
    const many = mapStats(Array.from({ length: 5 }, () => pin({ episodeCount: 12, ratingPercent: 80 })));
    expect(many.map((s) => s.key).sort()).toEqual(['episodes', 'pins', 'rating']);
  });
  it('shows at most three stats beside the pin count', () => {
    const all = pin({ price: 1, priceCurrency: 'USD', megawatts: 1, marketVolume: 1, episodeCount: 1, ratingPercent: 1, ticketLowUsd: 1 });
    expect(mapStats(Array.from({ length: 6 }, () => all))).toHaveLength(4);
  });
});
