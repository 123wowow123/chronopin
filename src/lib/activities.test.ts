import { describe, expect, it } from 'vitest';
import { ACTIVITY_CITIES, isActiveOn, localDay, monthInWindow, seasonOfMonth, windowEnd, windowStart } from './activities';

describe('activity seasons', () => {
  it('lists cities west to east', () => {
    const longitudes = ACTIVITY_CITIES.map((city) => city.longitude);
    expect(longitudes).toEqual([...longitudes].sort((a, b) => a - b));
  });

  it('maps months to meteorological seasons', () => {
    expect([12, 1, 2, 3, 6, 9, 11].map(seasonOfMonth)).toEqual(['winter', 'winter', 'winter', 'spring', 'summer', 'fall', 'fall']);
  });

  it('handles windows that wrap the new year', () => {
    expect(monthInWindow(12, 11, 3)).toBe(true);
    expect(monthInWindow(2, 11, 3)).toBe(true);
    expect(monthInWindow(7, 11, 3)).toBe(false);
  });

  it('uses the viewer-city calendar day', () => {
    expect(localDay(new Date('2026-10-18T03:00:00Z'), 'America/Los_Angeles').iso).toBe('2026-10-17');
  });

  const rink = { startMonth: 11, endMonth: 3, startDate: null, endDate: null };
  it('finds the next opening and the closing of an annual window', () => {
    const oct = { year: 2026, month: 10, iso: '2026-10-18' };
    expect(isActiveOn(rink, oct)).toBe(false);
    expect(windowStart(rink, oct)).toBe('2026-11-01');
    expect(windowEnd(rink, '2026-11-01')).toBe('2027-03-31');
    const feb = { year: 2027, month: 2, iso: '2027-02-10' };
    expect(isActiveOn(rink, feb)).toBe(true);
    expect(windowStart(rink, feb)).toBe('2026-11-01');
  });

  it('prefers a dated cycle that is still current', () => {
    const dated = { startMonth: 11, endMonth: 12, startDate: '2026-10-10', endDate: '2026-10-31' };
    const day = { year: 2026, month: 10, iso: '2026-10-18' };
    expect(isActiveOn(dated, day)).toBe(true);
    expect(windowStart(dated, day)).toBe('2026-10-10');
    expect(windowEnd(dated, '2026-10-10')).toBe('2026-10-31');
  });
});
