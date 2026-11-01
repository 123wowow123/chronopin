import { describe, expect, it } from 'vitest';
import { aiExposure, cScore, cTier, moatPoints, type TierInput } from './cTier';

const base: TierInput = { sic: 7372, roic: 0.2, grossMargin: 0.7, rdIntensity: 0.2, profitableAfterStockPay: true };

describe('aiExposure', () => {
  it('marks software, business services, advertising and consulting as high, the rest low', () => {
    expect(aiExposure(7372)).toBe('high');
    expect(aiExposure(7389)).toBe('high');
    expect(aiExposure(8742)).toBe('high');
    expect(aiExposure(2911)).toBe('low');
    expect(aiExposure(6021)).toBe('low');
    expect(aiExposure(null)).toBeNull();
  });
});

describe('moatPoints', () => {
  it('counts ROIC, gross margin, R&D and profit after stock pay', () => {
    expect(moatPoints(base)).toBe(4);
    expect(moatPoints({ ...base, roic: 0.05, grossMargin: 0.3 })).toBe(2);
    expect(moatPoints({ sic: 1, roic: null, grossMargin: null, rdIntensity: null, profitableAfterStockPay: false })).toBe(0);
  });
});

describe('cTier', () => {
  it('rates an exposed business with every moat point a Castle, and falls with the points', () => {
    expect(cTier(base)).toBe('Castle');
    expect(cTier({ ...base, rdIntensity: 0.03 })).toBe('Chapel');
    expect(cTier({ ...base, rdIntensity: 0.03, grossMargin: 0.3 })).toBe('Stone');
  });
  it('calls an exposed business with no R&D Wood: the technology is borrowed', () => {
    expect(cTier({ ...base, rdIntensity: 0.005 })).toBe('Wood');
  });
  it('rates a low-exposure business Fortress with three or more points, Stone with none', () => {
    expect(cTier({ ...base, sic: 2911 })).toBe('Fortress');
    expect(cTier({ ...base, sic: 2911, roic: 0.02, grossMargin: 0.1, rdIntensity: 0, profitableAfterStockPay: false })).toBe('Stone');
  });
  it('is null (Unrated) without an industry or any moat figure', () => {
    expect(cTier({ ...base, sic: null })).toBeNull();
    expect(cTier({ sic: 7372, roic: null, grossMargin: null, rdIntensity: null, profitableAfterStockPay: true })).toBeNull();
  });
});

describe('cScore', () => {
  const good = { ownersEarnings: 90, netIncome: 100, tier: 'Fortress' as const, grossMargin: 0.8, roic: 0.3, ratio: 0.5 };
  it('is high for a cheap, high-quality stock and low for an expensive weak one', () => {
    expect(cScore(good)).toBeGreaterThan(85);
    expect(cScore({ ownersEarnings: 10, netIncome: 100, tier: 'Wood', grossMargin: 0.2, roic: 0.02, ratio: 6 })).toBeLessThan(20);
  });
  it('rises as the price falls against C-IV15', () => {
    expect(cScore({ ...good, ratio: 1 })).toBeLessThan(cScore({ ...good, ratio: 0.6 }));
  });
  it('stays within 0-100', () => {
    expect(cScore({ ...good, ratio: 0.01 })).toBeLessThanOrEqual(100);
    expect(cScore({ ownersEarnings: -50, netIncome: 10, tier: null, grossMargin: null, roic: null, ratio: 99 })).toBeGreaterThanOrEqual(0);
  });
});
