import { describe, expect, it } from 'vitest';
import { holdingPnl, holdingsAreStale, preferredHoldings, type Holding, type HoldingsSnapshot } from './holdings';

const position: Holding = { symbol: 'TEST', name: 'Test security', weightPercent: 20, shares: 10, side: 'long', currency: 'USD', costBasis: 1000, marketValue: 1200, valuationDate: '2026-10-23', costSourceUrl: 'https://example.org/cost', valueSourceUrl: 'https://example.org/value' };
describe('holding P&L', () => {
  it('calculates unrealized long and short gains and losses from position totals', () => {
    expect(holdingPnl(position)).toEqual({ amount: 200, percent: 20 });
    expect(holdingPnl({ ...position, marketValue: 800 })).toEqual({ amount: -200, percent: -20 });
    expect(holdingPnl({ ...position, side: 'short', marketValue: 800 })).toEqual({ amount: 200, percent: 20 });
    expect(holdingPnl({ ...position, side: 'short' })).toEqual({ amount: -200, percent: -20 });
  });
  it('distinguishes actual zero profit and total losses from unknown costs or values', () => {
    expect(holdingPnl({ ...position, marketValue: 1000 })).toEqual({ amount: 0, percent: 0 });
    expect(holdingPnl({ ...position, marketValue: 0 })).toEqual({ amount: -1000, percent: -100 });
    for (const change of [{ costBasis: null }, { costBasis: 0 }, { marketValue: null }, { costSourceUrl: null }, { valueSourceUrl: null }, { valuationDate: null }, { marketValue: Infinity }]) expect(holdingPnl({ ...position, ...change })).toBeNull();
    expect(holdingPnl({ ...position, shares: null, costBasis: null, marketValue: null })).toBeNull();
  });
  it('marks dated evidence older than a week without presenting it as live', () => {
    expect(holdingsAreStale('2026-10-23', '2026-10-25')).toBe(false);
    expect(holdingsAreStale('2026-09-30', '2026-10-25')).toBe(true);
  });
  it('prefers direct disclosures while keeping dated strategies separate', () => {
    const base = { asOf: '2026-10-25' };
    const snapshots = [{ ...base, key: 'strategy', scope: 'strategy' }, { ...base, key: 'fund', scope: 'fund', asOf: '2026-06-30' }, { ...base, key: 'personal', scope: 'personal', asOf: '2025-12-31' }] as HoldingsSnapshot[];
    expect(preferredHoldings(snapshots).map(p => p.key)).toEqual(['personal', 'fund', 'strategy']);
    expect(snapshots[0].key).toBe('strategy');
  });
});
