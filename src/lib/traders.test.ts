import { describe, expect, it } from 'vitest';
import { estimatePnlPercent } from './traders';

describe('estimatePnlPercent', () => {
  it('moves with the underlying for a long', () => {
    expect(estimatePnlPercent({ instrument: 'stock', action: 'buy', entryPrice: 100 }, 110)).toBe(10);
  });
  it('reverses for puts and shorts', () => {
    expect(estimatePnlPercent({ instrument: 'put', action: 'buy', entryPrice: 100 }, 90)).toBe(10);
  });
  it('has none for sells, holds or a missing price', () => {
    expect(estimatePnlPercent({ instrument: 'stock', action: 'sell', entryPrice: 100 }, 90)).toBeNull();
    expect(estimatePnlPercent({ instrument: 'stock', action: 'buy', entryPrice: null }, 90)).toBeNull();
  });
});
