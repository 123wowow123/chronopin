import { describe, expect, it } from 'vitest';
import { bothMoney, convertMoney, localMoney, usdPriceSql } from './currency';

describe('currency', () => {
  it('converts through the fixed dollar rates', () => {
    expect(convertMoney(84, 'INR', 'USD')).toBeCloseTo(1);
    expect(convertMoney(1, 'USD', 'JPY')).toBe(150);
    expect(convertMoney(1, 'USD', 'XXX')).toBeNull();
  });

  it('keeps a price in the page currency as stored and marks a converted one', () => {
    expect(localMoney(4_000_000_000, 'USD', 'en')).toBe('$4B');
    expect(localMoney(130_000_000_000, 'INR', 'en')).toBe('≈$1.5B');
    expect(localMoney(4_000_000_000, 'USD', 'ja')).toMatch(/^≈¥/);
    expect(localMoney(100, 'XXX', 'en')).toBe('XXX 100.00');
  });

  it('gives both amounts only when they differ', () => {
    expect(bothMoney(100, 'USD', 'en').local).toBeNull();
    expect(bothMoney(3_200_000_000, 'EUR', 'en')).toEqual({ stated: '€3.2B', local: '≈$3.5B' });
  });

  it('builds a CASE that treats a missing currency as dollars', () => {
    const sql = usdPriceSql('"p"."price"', '"p"."priceCurrency"');
    expect(sql).toContain(`WHEN 'EUR' THEN "p"."price"::numeric / 0.92`);
    expect(sql).toContain(`coalesce("p"."priceCurrency", 'USD')`);
  });
});
