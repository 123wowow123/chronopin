import { describe, expect, it } from 'vitest';
import { ACTIVITY_CITIES, activitiesForTrip, activitiesNearCity, activityCity, isActiveOn, localDay, monthInWindow, seasonOfMonth, windowEnd, windowStart, type ActivityCatalogItem } from './activities';
import catalog from '../server/data/activities.json';
import { activityProblems } from './activityCatalog';
import tripResearch from '../../scripts/activities/tripResearch.json';

describe('activity seasons', () => {
  it('only recommends explicit trip lengths, independently of event duration', () => {
    const day = { activity: { tripDays: [1] as (1 | 2)[] } };
    const both = { activity: { tripDays: [1, 2] as (1 | 2)[] } };
    const unclassified = { activity: {} };
    expect(activitiesForTrip([day, both, unclassified], 1)).toEqual([day, both]);
    expect(activitiesForTrip([day, both, unclassified], 2)).toEqual([both]);
  });

  it('has at least 50 distinct day-trip and two-day suggestions within every guide’s default radius', () => {
    const pins = (catalog as ActivityCatalogItem[]).map((activity) => ({ activity }));
    expect(pins.flatMap((pin) => activityProblems(pin.activity))).toEqual([]);
    for (const city of ACTIVITY_CITIES) {
      const nearby = activitiesNearCity(pins, city);
      expect(activitiesForTrip(nearby, 1).length, `${city.slug} day trips`).toBeGreaterThanOrEqual(50);
      expect(activitiesForTrip(nearby, 2).length, `${city.slug} 2-day trips`).toBeGreaterThanOrEqual(50);
    }
  });

  it('counts seasonal variations of a destination once per trip tab', () => {
    const winter = { activity: { tripDays: [1, 2] as (1 | 2)[], tripDestinationKey: 'same-park' } };
    const summer = { activity: { tripDays: [1, 2] as (1 | 2)[], tripDestinationKey: 'same-park' } };
    const other = { activity: { tripDays: [2] as (1 | 2)[], tripDestinationKey: 'other-park' } };
    expect(activitiesForTrip([winter, summer, other], 1)).toEqual([winter]);
    expect(activitiesForTrip([winter, summer, other], 2)).toEqual([winter, other]);
  });

  it('backs every trip recommendation with recorded source evidence and planning notes', () => {
    const sources = new Map(tripResearch.map((entry) => [entry.key, entry]));
    for (const item of catalog as ActivityCatalogItem[]) {
      if (!item.tripDays?.length) continue;
      const source = sources.get(`${item.citySlug}/${item.slug}`);
      expect(source, `${item.citySlug}/${item.slug}`).toBeDefined();
      expect(source?.url).toMatch(/^https:\/\//);
      expect(source?.title.trim().length).toBeGreaterThan(0);
      expect(source?.quote.trim().length).toBeGreaterThan(0);
      expect(source?.tripDays).toEqual(item.tripDays);
      if (item.tripDays.includes(1)) expect(item.tripPlan?.day?.trim().length).toBeGreaterThan(0);
      if (item.tripDays.includes(2)) expect(item.tripPlan?.overnight?.trim().length).toBeGreaterThan(0);
    }
  });
  it('includes nearby outings assigned to another city and excludes distant ones', () => {
    const sanDiego = activityCity('san-diego')!;
    const local = { activity: { citySlug: 'san-diego', latitude: 32.72, longitude: -117.16 } };
    const anaheim = { activity: { citySlug: 'los-angeles', latitude: 33.81, longitude: -117.92 } };
    const newYork = { activity: { citySlug: 'new-york', latitude: 40.71, longitude: -74.01 } };
    expect(activitiesNearCity([local, anaheim, newYork], sanDiego)).toEqual([local, anaheim]);
    expect(activitiesNearCity([local, anaheim, newYork], sanDiego, 50)).toEqual([local]);
  });

  it('includes a venue at the city center even at a zero radius', () => {
    const city = activityCity('boston')!;
    const pin = { activity: city };
    expect(activitiesNearCity([pin], city, 0)).toEqual([pin]);
  });
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

  it('does not extend exact event dates to the whole month', () => {
    const dated = { startMonth: 10, endMonth: 11, startDate: '2026-10-02', endDate: '2026-11-15' };
    expect(isActiveOn(dated, { month: 10, iso: '2026-10-01' })).toBe(false);
    expect(isActiveOn(dated, { month: 11, iso: '2026-11-15' })).toBe(true);
    expect(isActiveOn(dated, { month: 11, iso: '2026-11-16' })).toBe(false);
    expect(isActiveOn(dated, { month: 10, iso: '2027-10-10' })).toBe(true);
  });

  it('keeps the end of a dated winter cycle closed until its next annual opening', () => {
    const dated = { startMonth: 11, endMonth: 2, startDate: '2026-11-10', endDate: '2027-02-15' };
    expect(isActiveOn(dated, { month: 2, iso: '2027-02-20' })).toBe(false);
    expect(isActiveOn(dated, { month: 11, iso: '2027-11-20' })).toBe(true);
  });
});
