import { describe, expect, it } from 'vitest';
import { RESTAURANT_REGIONS, nearestRestaurantRegion, openingDateLabel, openingGroup } from './restaurants';
import { blobUrl, smallThumbName } from './appConfig';

describe('regional restaurant opening status', () => {
  it('preserves public restaurant images in pin cards and detail galleries', () => {
    const image = '/restaurant-images/new-york/top/le-bernardin.webp';
    expect(blobUrl(image)).toBe(image);
    expect(smallThumbName(image)).toBe(image);
    expect(smallThumbName('https://example.com/photo.webp')).toBe('https://example.com/photo.webp');
    expect(smallThumbName('photo.webp')).toBe('s/photo.webp');
  });
  it('includes the 90th day but excludes older confirmed openings', () => {
    expect(openingGroup({ day: '2026-07-08', confirmed: true }, '2026-10-06')).toBe('new');
    expect(openingGroup({ day: '2026-07-07', confirmed: true }, '2026-10-06')).toBeNull();
  });
  it('does not turn a passed announcement into a confirmed opening', () => {
    expect(openingGroup({ day: '2026-09-30', confirmed: false }, '2026-10-06')).toBe('upcoming');
    expect(openingGroup({ day: '2026-10-06', confirmed: false }, '2026-10-06')).toBe('upcoming');
    expect(openingGroup({ day: '2026-06-30', confirmed: false }, '2026-10-06')).toBeNull();
  });
  it('compares calendar days, including opening today and future-year dates', () => {
    expect(openingGroup({ day: '2026-10-06', confirmed: true }, '2026-10-06')).toBe('new');
    expect(openingGroup({ day: '2027-01-31', confirmed: false }, '2026-10-06')).toBe('upcoming');
  });
  it('keeps estimated months and seasons distinct from confirmed exact dates', () => {
    expect(openingDateLabel('2026-10-31', true)).toBe('Oct 2026');
    expect(openingDateLabel('2026-12-31', true, 'Opening early winter 2026')).toBe('Early winter 2026');
    expect(openingDateLabel('2026-12-20', true, 'Official site says fall 2026')).toBe('Fall 2026');
    expect(openingDateLabel('2026-12-31', true, 'Late 2026 target')).toBe('Late 2026');
    expect(openingDateLabel('2027-03-31', true, 'Early 2027 target')).toBe('Early 2027');
    expect(openingDateLabel('2026-08-28', false)).toBe('Aug 28, 2026');
  });
});

describe('nearest restaurant guide', () => {
  it('orders Taiwan cities west to east and uses their local clock', () => {
    const regions = RESTAURANT_REGIONS.filter((region) => region.country === 'Taiwan');
    expect(regions.map((region) => region.slug)).toEqual(['kaohsiung', 'taichung', 'taipei']);
    for (const region of regions) {
      expect(nearestRestaurantRegion(region).slug).toBe(region.slug);
      expect(new Intl.DateTimeFormat('en-GB', { timeZone: region.timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date('2026-10-10T00:00:00Z'))).toBe('08');
    }
  });
  it('routes New Zealand and Mexican visitors to their local cities and clocks', () => {
    for (const slug of ['christchurch', 'auckland', 'wellington', 'guadalajara', 'monterrey', 'mexico-city']) {
      const region = RESTAURANT_REGIONS.find((item) => item.slug === slug)!;
      expect(nearestRestaurantRegion(region).slug).toBe(slug);
      expect(() => new Intl.DateTimeFormat('en', { timeZone: region.timeZone })).not.toThrow();
    }
    const hour = (slug: string) => new Intl.DateTimeFormat('en-GB', {
      timeZone: RESTAURANT_REGIONS.find((item) => item.slug === slug)!.timeZone,
      hour: '2-digit', hourCycle: 'h23',
    }).format(new Date('2026-10-09T00:00:00Z'));
    expect(hour('auckland')).toBe('13');
    expect(hour('mexico-city')).toBe('18');
  });
  it('routes Japanese visitors to the nearest supported city on Japan time', () => {
    for (const slug of ['tokyo', 'kyoto', 'osaka']) {
      const region = RESTAURANT_REGIONS.find((item) => item.slug === slug)!;
      expect(nearestRestaurantRegion(region).slug).toBe(slug);
      expect(region.country).toBe('Japan');
      expect(new Intl.DateTimeFormat('en-GB', { timeZone: region.timeZone, hour: '2-digit', hourCycle: 'h23' }).format(new Date('2026-10-09T00:00:00Z'))).toBe('09');
    }
  });
  it('routes Canadian visitors to local guides, including neighboring Canadian cities', () => {
    expect(nearestRestaurantRegion({ latitude: 49.26, longitude: -123.12 }).slug).toBe('vancouver');
    expect(nearestRestaurantRegion({ latitude: 48.43, longitude: -123.37 }).slug).toBe('victoria');
    expect(nearestRestaurantRegion({ latitude: 43.25, longitude: -79.86 }).slug).toBe('hamilton');
    expect(nearestRestaurantRegion({ latitude: 43.67, longitude: -79.39 }).slug).toBe('toronto');
    expect(nearestRestaurantRegion({ latitude: 44.65, longitude: -63.58 }).slug).toBe('halifax');
  });
  it('keeps Saskatchewan on the same clock while Alberta observes daylight saving', () => {
    const hour = (slug: string, day: string) => new Intl.DateTimeFormat('en-GB', {
      timeZone: RESTAURANT_REGIONS.find((region) => region.slug === slug)!.timeZone,
      hour: '2-digit', hourCycle: 'h23',
    }).format(new Date(`${day}T12:00:00Z`));
    expect(hour('saskatoon', '2026-01-15')).toBe('06');
    expect(hour('saskatoon', '2026-07-15')).toBe('06');
    expect(hour('calgary', '2026-01-15')).toBe('05');
    expect(hour('calgary', '2026-07-15')).toBe('06');
  });
  it('routes European visitors to their local guide with a valid local time zone', () => {
    for (const slug of ['london', 'paris', 'amsterdam', 'berlin', 'madrid', 'barcelona', 'lisbon', 'rome', 'copenhagen', 'vienna', 'dublin', 'stockholm']) {
      const region = RESTAURANT_REGIONS.find((item) => item.slug === slug)!;
      expect(nearestRestaurantRegion(region).slug).toBe(slug);
      expect(() => new Intl.DateTimeFormat('en', { timeZone: region.timeZone })).not.toThrow();
    }
    expect(nearestRestaurantRegion({ latitude: 48.15, longitude: 17.11 }).slug).toBe('vienna');
    expect(nearestRestaurantRegion({ latitude: 51.45, longitude: -2.59 }).slug).toBe('london');
  });
  it('keeps city navigation ordered from west to east', () => {
    expect(RESTAURANT_REGIONS.map((region) => region.longitude)).toEqual(RESTAURANT_REGIONS.map((region) => region.longitude).toSorted((a, b) => a - b));
  });
  it('chooses the closest supported city, including neighboring cities', () => {
    expect(nearestRestaurantRegion({ latitude: 32.8, longitude: -117.2 }).slug).toBe('san-diego');
    expect(nearestRestaurantRegion({ latitude: 37.35, longitude: -121.95 }).slug).toBe('san-jose');
    expect(nearestRestaurantRegion({ latitude: 40.73, longitude: -73.9 }).slug).toBe('new-york');
    expect(nearestRestaurantRegion({ latitude: 45.52, longitude: -122.68 }).slug).toBe('seattle');
  });
  it('falls back to San Diego for absent or invalid coordinates', () => {
    for (const place of [null, undefined, { latitude: NaN, longitude: 0 }, { latitude: 91, longitude: 0 }]) {
      expect(nearestRestaurantRegion(place).slug).toBe('san-diego');
    }
  });
});
