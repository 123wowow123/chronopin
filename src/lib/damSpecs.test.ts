import { describe, expect, it } from 'vitest';
import { acreFeet, aggregateDams, damTiles, usdShort, type DamRow, type PinDamJson } from './damSpecs';

const base: PinDamJson = { heightFt: null, crestLengthFt: null, storageAcreFt: null, addedStorageAcreFt: null, capacityMw: null, damType: null, river: null, owner: null, state: null, scope: null, basis: null, sourceUrl: null, note: null, checkedAt: '2026-11-09T00:00:00Z' };
const row = (o: Partial<DamRow>): DamRow => ({ id: 1, title: 't', href: '/pin/1/t', state: 'CA', status: 'Proposed', scope: 'new', heightFt: null, storageAcreFt: null, addedStorageAcreFt: null, capacityMw: null, price: null, priceCurrency: null, lat: 37, lon: -121, start: null, end: null, ...o });

describe('damTiles', () => {
  it('skips missing figures and keeps a fixed order', () => {
    const tiles = damTiles({ ...base, heightFt: 471, addedStorageAcreFt: 77000, damType: 'rcc', scope: 'raise' });
    expect(tiles.map((t) => t.key)).toEqual(['height', 'added', 'type']);
    expect(tiles[0].value).toBe('471 ft');
    expect(tiles[2].sub).toBe('Dam raise');
  });
  it('gives nothing for an empty row', () => expect(damTiles(base)).toEqual([]));
});

describe('formatting', () => {
  it('words acre-feet', () => { expect(acreFeet(1_500_000)).toBe('1.5M acre-ft'); expect(acreFeet(77000)).toBe('77,000 acre-ft'); });
  it('shortens dollars', () => { expect(usdShort(2_800_000_000)).toBe('$2.8B'); expect(usdShort(320_000_000)).toBe('$320M'); });
});

describe('aggregateDams', () => {
  it('sums USD only, per state, and finds the tallest', () => {
    const { totals, byState } = aggregateDams([
      row({ id: 1, state: 'CA', price: 1.13e9, priceCurrency: 'USD', storageAcreFt: 1000, heightFt: 100, lat: 34, lon: -117 }),
      row({ id: 2, state: 'CA', price: 5e8, priceCurrency: 'EUR', heightFt: 471, lat: 36, lon: -119 }),
      row({ id: 3, state: 'CO', status: 'In Progress', price: 2e8, priceCurrency: 'USD', capacityMw: 100, lat: 40, lon: -105 }),
      row({ id: 4, state: null, lat: null, lon: null }),
    ]);
    expect(totals.count).toBe(4);
    expect(totals.costUsd).toBe(1.33e9);
    expect(totals.pricedCount).toBe(2);
    expect(totals.tallestId).toBe(2);
    expect(totals.states).toBe(2);
    expect(totals.byStatus).toEqual({ Proposed: 3, 'In Progress': 1 });
    expect(byState[0]).toMatchObject({ state: 'CA', count: 2, costUsd: 1.13e9, lat: 35, lon: -118 });
  });
});
