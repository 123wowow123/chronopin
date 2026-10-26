import { describe, expect, it } from 'vitest';
import catalog from './data/personHoldings.json';
import { readHoldings } from './holdingsInput';
import primary from './data/personHoldingsPrimary.json';
import { holdingPnl } from '@/lib/holdings';

const example = () => ({ name: catalog.profiles[0].name, portfolios: readHoldings(catalog.profiles[0]) });
describe('holdings evidence contract', () => {
  it('accepts every imported strategy and preserves unknown inputs rather than inventing profit', () => {
    expect(catalog.profiles.length).toBe(70);
    for (const person of catalog.profiles) {
      const parsed = readHoldings(person);
      expect(parsed).toEqual(person.portfolios);
      for (const p of parsed) {
        expect(p.scope).toBe('strategy');
        for (const h of p.holdings) expect([h.costBasis, h.marketValue, h.shares]).toEqual([null, null, null]);
      }
    }
  });
  it('requires source URLs, truthful coverage and valid dates', () => {
    for (const change of [{ sourceUrl: 'http://example.org' }, { asOf: '2026-02-30' }, { asOf: '2099-01-01' }, { checkedAt: '2020-01-01' }, { complete: true, undisclosedCount: 1 }, { undisclosedCount: 1.5 }, { scope: 'personal-profit' }]) {
      const p = example(); Object.assign(p.portfolios[0], change);
      expect(() => readHoldings(p)).toThrow();
    }
  });
  it('requires cost and valuation sources and a valuation date when financial totals are supplied', () => {
    const p = example(); const h = p.portfolios[0].holdings[0];
    Object.assign(h, { costBasis: 100, marketValue: 150 });
    expect(() => readHoldings(p)).toThrow();
    Object.assign(h, { costSourceUrl: 'https://example.org/cost', valueSourceUrl: 'https://example.org/value', valuationDate: '2026-10-23' });
    expect(readHoldings(p)[0].holdings[0]).toMatchObject({ costBasis: 100, marketValue: 150 });
    Object.assign(h, { marketValue: NaN });
    expect(() => readHoldings(p)).toThrow();
  });
  it('rejects duplicate securities, duplicate strategy keys and invalid weights', () => {
    const p = example(); p.portfolios[0].holdings.push(p.portfolios[0].holdings[0]);
    expect(() => readHoldings(p)).toThrow(/Duplicate holding/);
    const q = example(); q.portfolios.push(q.portfolios[0]);
    expect(() => readHoldings(q)).toThrow(/Duplicate portfolio/);
    const r = example(); r.portfolios[0].holdings[0].weightPercent = 150;
    expect(() => readHoldings(r)).toThrow();
  });
  it('allows empty public coverage without turning it into a zero-size personal portfolio', () => {
    expect(readHoldings({ portfolios: [] })).toEqual([]);
  });
  it('accepts primary disclosures without treating fund assets as personal or ranges as precise values', () => {
    expect(primary.profiles.length).toBeGreaterThanOrEqual(20);
    for (const person of primary.profiles) for (const p of readHoldings(person)) {
      expect(['personal', 'fund']).toContain(p.scope);
      expect(p.coverageNote).toBeTruthy();
      for (const h of p.holdings) {
        expect(h.valueSourceUrl).toMatch(/^https:\/\//);
        if (h.marketValueLow != null) {
          expect(h.marketValue).toBeNull();
          expect(holdingPnl(h)).toBeNull();
          expect(h.owner).toBeTruthy();
        }
      }
    }
  });
  it('computes dated Berkshire gains only from the annual-report cost and fair-value pairs', () => {
    const p = primary.profiles.find(p => p.name === 'Warren Buffett')!;
    const annual = readHoldings(p).find(s => s.key === 'berkshire-annual-costs-2025')!;
    expect(annual.asOf).toBe('2025-12-31');
    expect(annual.holdings).toHaveLength(9);
    expect(annual.holdings.every(h => h.weightPercent === null)).toBe(true);
    expect(holdingPnl(annual.holdings.find(h => h.symbol === 'AAPL')!)?.amount).toBe(55707000000);
    expect(holdingPnl(annual.holdings.find(h => h.symbol === 'KO')!)?.amount).toBe(26665000000);
  });
  it('requires range evidence and keeps distinct family owners of the same stock', () => {
    const p = example();
    const h = p.portfolios[0].holdings[0];
    Object.assign(h, { owner: 'spouse', weightPercent: null, marketValue: null, marketValueLow: 1001, marketValueHigh: 15000, valueSourceUrl: 'https://example.org/annual', valuationDate: '2025-12-31' });
    p.portfolios[0].holdings.push({ ...h, owner: 'self' });
    expect(readHoldings(p)[0].holdings.filter(r => r.symbol === h.symbol)).toHaveLength(2);
    h.valueSourceUrl = null;
    expect(() => readHoldings(p)).toThrow();
    h.valueSourceUrl = 'https://example.org/annual'; h.marketValueHigh = 500;
    expect(() => readHoldings(p)).toThrow();
  });
});
