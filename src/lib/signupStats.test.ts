import { describe, expect, it } from 'vitest';
import { signupStats } from './signupStats';
import { unitFor } from './timeStats';

describe('signupStats', () => {
  const now = new Date('2026-09-14T12:00:00Z');

  it('buckets the last 30 days by UTC day, carrying earlier accounts into the total', () => {
    const stats = signupStats(['2025-01-01T00:00:00Z', '2026-09-13T23:59:59Z', '2026-09-14T00:00:00Z', '2026-09-14T08:00:00Z'], '30d', now);
    expect(stats.unit).toBe('day');
    expect(stats.buckets).toHaveLength(30);
    expect(stats.buckets[0]).toEqual({ start: '2026-08-16T00:00:00.000Z', signups: 0, total: 1 });
    expect(stats.buckets.at(-2)).toEqual({ start: '2026-09-13T00:00:00.000Z', signups: 1, total: 2 });
    expect(stats.buckets.at(-1)).toEqual({ start: '2026-09-14T00:00:00.000Z', signups: 2, total: 4 });
    expect(stats.signups).toBe(3);
  });

  it('weeks start on Monday', () => {
    const stats = signupStats(['2026-09-13T10:00:00Z', '2026-09-14T10:00:00Z'], '90d', now);
    expect(stats.unit).toBe('week');
    expect(stats.buckets.at(-2)).toMatchObject({ start: '2026-09-07T00:00:00.000Z', signups: 1 });
    expect(stats.buckets.at(-1)).toMatchObject({ start: '2026-09-14T00:00:00.000Z', signups: 1, total: 2 });
  });

  it('all time starts at the first account and picks the unit from the span', () => {
    const stats = signupStats(['2020-03-15T00:00:00Z', '2026-09-01T00:00:00Z'], 'all', now);
    expect(stats.unit).toBe('month');
    expect(stats.buckets[0]).toMatchObject({ start: '2020-03-01T00:00:00.000Z', signups: 1, total: 1 });
    expect(stats.buckets.at(-1)).toMatchObject({ start: '2026-09-01T00:00:00.000Z', signups: 1, total: 2 });
    expect(unitFor(10)).toBe('day');
    expect(unitFor(365)).toBe('week');
  });
});
