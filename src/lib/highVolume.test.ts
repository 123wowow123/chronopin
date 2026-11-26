import { describe, expect, it } from 'vitest';
import { ADV_DAYS, highVolumeDays, highVolumeSince, recentTrend, type DailyBar } from './highVolume';

const day = (i: number) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
const flat = (n: number): DailyBar[] => Array.from({ length: n }, (_, i) => ({ day: day(i), close: 100, volume: 1000 }));
const then = (...last: Omit<DailyBar, 'day'>[]) => [...flat(ADV_DAYS), ...last.map((b, i) => ({ ...b, day: day(ADV_DAYS + i) }))];

describe('highVolumeSince', () => {
  it('counts today as the first of the days', () => {
    const now = Date.parse('2026-11-25T23:00:00Z');
    expect(highVolumeSince(1, now)).toBe('2026-11-25');
    expect(highVolumeSince(14, now)).toBe('2026-11-12');
  });
});

describe('recentTrend', () => {
  const bars = (...closes: number[]) => closes.map((close, i) => ({ day: day(i), close, volume: 1 }));

  it('is up or down only when all of the last three sessions went that way', () => {
    expect(recentTrend(bars(9, 1, 2, 3, 4))).toBe('up');
    expect(recentTrend(bars(1, 9, 8, 7, 6).reverse())).toBe('down');
  });

  it('is blank when mixed, unchanged or too short', () => {
    expect(recentTrend(bars(1, 2, 1, 3))).toBeNull();
    expect(recentTrend(bars(1, 2, 2, 3))).toBeNull();
    expect(recentTrend(bars(1, 2, 3))).toBeNull();
  });
});

describe('highVolumeDays', () => {
  it('takes a higher close on twice the average volume', () => {
    expect(highVolumeDays(then({ close: 110, volume: 2000 }), day(0))).toEqual([
      { day: day(ADV_DAYS), change: expect.closeTo(0.1), multiple: 2, sinceChange: 0, up: 0, down: 0 },
    ]);
  });

  it('counts the up and down sessions after the day, not the day or unchanged closes', () => {
    const quiet = (close: number) => ({ close, volume: 1000 });
    const bars = then({ close: 110, volume: 2000 }, quiet(112), quiet(112), quiet(105), quiet(101), quiet(103));
    // From the day's close of 110 to the latest of 103.
    expect(highVolumeDays(bars, day(0))[0]).toMatchObject({ up: 2, down: 2, sinceChange: expect.closeTo(103 / 110 - 1) });
  });

  it('takes a lower close on twice the average volume, with a negative change', () => {
    expect(highVolumeDays(then({ close: 90, volume: 2500 }), day(0))).toEqual([
      { day: day(ADV_DAYS), change: expect.closeTo(-0.1), multiple: 2.5, sinceChange: 0, up: 0, down: 0 },
    ]);
  });

  it('refuses an unchanged close, and volume under twice the average', () => {
    expect(highVolumeDays(then({ close: 100, volume: 5000 }), day(0))).toEqual([]);
    expect(highVolumeDays(then({ close: 110, volume: 1999 }), day(0))).toEqual([]);
    expect(highVolumeDays(then({ close: 90, volume: 1999 }), day(0))).toEqual([]);
  });

  it('needs a full average behind the day', () => {
    const bars = [...flat(ADV_DAYS - 1), { day: day(ADV_DAYS - 1), close: 110, volume: 9000 }];
    expect(highVolumeDays(bars, day(0))).toEqual([]);
  });

  it('averages only the days before, lists newest first and honours since', () => {
    const bars = then({ close: 110, volume: 3000 }, { close: 120, volume: 3000 }).reverse();
    const hits = highVolumeDays(bars, day(0));
    expect(hits.map((h) => h.day)).toEqual([day(ADV_DAYS + 1), day(ADV_DAYS)]);
    // The second day's average includes the first spike: (49 * 1000 + 3000) / 50.
    expect(hits[0].multiple).toBeCloseTo(3000 / 1040);
    expect(highVolumeDays(bars, day(ADV_DAYS + 1))).toHaveLength(1);
  });
});
