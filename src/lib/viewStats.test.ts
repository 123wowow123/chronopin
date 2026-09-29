import { describe, expect, it } from 'vitest';
import { rangeStartDay, viewStats } from './viewStats';

describe('viewStats', () => {
  const now = new Date('2026-09-15T12:00:00Z');
  const days = [
    { day: '2026-01-02', signedIn: 4, guests: 4 },
    { day: '2026-09-01', signedIn: 1, guests: 2 },
    { day: '2026-09-15', signedIn: 3, guests: 5 },
  ];

  it('sums the days inside the range by UTC day', () => {
    const stats = viewStats(days, '30d', now);
    expect(stats).toMatchObject({ unit: 'day', views: 11, signedIn: 4 });
    expect(stats.buckets).toHaveLength(30);
    expect(stats.buckets.at(-1)).toEqual({ start: '2026-09-15T00:00:00.000Z', signedIn: 3, guests: 5 });
    expect(stats.buckets.find((b) => b.start.startsWith('2026-09-01'))).toMatchObject({ signedIn: 1, guests: 2 });
  });

  it('starts all time at the earliest day', () => {
    const stats = viewStats(days, 'all', now);
    expect(stats).toMatchObject({ views: 19, signedIn: 8 });
  });

  it('has empty buckets and no rate with no views', () => {
    expect(viewStats([], '30d', now)).toMatchObject({ views: 0, perUnit: 0 });
  });
});

describe('rangeStartDay', () => {
  const now = new Date('2026-09-15T12:00:00Z');

  it('is the first day the chart shows, floored to its week for longer ranges', () => {
    expect(rangeStartDay('30d', now)).toBe('2026-08-17');
    // 89 days back is Thursday 2026-06-18; weekly columns start on Monday.
    expect(rangeStartDay('90d', now)).toBe('2026-06-15');
    expect(rangeStartDay('all', now)).toBeNull();
  });
});
