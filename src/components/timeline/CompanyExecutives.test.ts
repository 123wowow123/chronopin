import { describe, expect, it } from 'vitest';
import { payTrend } from './CompanyExecutives';

const garman = {
  fiscalYear: 2025,
  totalCompensation: 617_281,
  stockAwards: 0,
  estimated: false,
  payHistory: [{ year: 2024, total: 33_180_619, stockAwards: 32_796_343 }],
};

describe('payTrend', () => {
  it('adds the years shown and names the last stock grant when this year had none', () => {
    expect(payTrend(garman)).toEqual({
      multiYear: { total: 33_797_900, from: 2024, to: 2025 },
      lastGrant: { year: 2024, amount: 32_796_343 },
    });
  });

  it('has no grant note when stock was awarded this year, and nothing without history or on an estimate', () => {
    expect(payTrend({ ...garman, stockAwards: 5_000_000 }).lastGrant).toBeNull();
    expect(payTrend({ ...garman, payHistory: null })).toEqual({ multiYear: null, lastGrant: null });
    expect(payTrend({ ...garman, estimated: true })).toEqual({ multiYear: null, lastGrant: null });
  });
});
