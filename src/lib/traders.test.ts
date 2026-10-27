import { describe, expect, it } from 'vitest';
import { estimatePnlPercent, pnlExtremes } from './traders';

describe('estimatePnlPercent', () => {
  it('moves with the underlying for a long', () => {
    expect(estimatePnlPercent({ instrument: 'stock', action: 'buy', entryPrice: 100 }, 110)).toBe(10);
  });
  it('reverses for puts and shorts', () => {
    expect(estimatePnlPercent({ instrument: 'put', action: 'buy', entryPrice: 100 }, 90)).toBe(10);
  });
  it('scores a sell as an exit and a hold like a buy', () => {
    expect(estimatePnlPercent({ instrument: 'stock', action: 'sell', entryPrice: 100 }, 90)).toBe(10);
    expect(estimatePnlPercent({ instrument: 'call', action: 'hold', entryPrice: 100 }, 110)).toBe(10);
  });
  it('has none for a missing price', () => {
    expect(estimatePnlPercent({ instrument: 'stock', action: 'buy', entryPrice: null }, 90)).toBeNull();
  });
});

describe('pnlExtremes', () => {
  it('finds the best and worst close since the trade date', () => {
    const closes = [{ day: '2026-10-01', close: 50 }, { day: '2026-10-05', close: 100 }, { day: '2026-10-06', close: 80 }, { day: '2026-10-07', close: 120 }];
    const row = { instrument: 'stock' as const, action: 'buy' as const, entryPrice: 100, tradeDate: '2026-10-05' };
    expect(pnlExtremes(row, closes, 110)).toEqual({ maxGainPercent: 20, maxDrawdownPercent: -20 });
    expect(pnlExtremes({ ...row, instrument: 'put' }, closes, 110)).toEqual({ maxGainPercent: 20, maxDrawdownPercent: -20 });
  });
});
