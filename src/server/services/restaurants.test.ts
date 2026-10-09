import { afterEach, describe, expect, it, vi } from 'vitest';
import { regionalTopRestaurants, restaurantOf, restaurantGuideRegionSlugs } from './restaurants';
import { RESTAURANT_REGIONS } from '@/lib/restaurants';
import type { PinJson } from '@/lib/types';
import catalog from '@/server/data/regionalRestaurants.json';
import specials from '@/server/data/restaurantSpecials.json';

const { findBySourceUrls, query, listSpecialVenues } = vi.hoisted(() => ({ findBySourceUrls: vi.fn(), query: vi.fn(), listSpecialVenues: vi.fn() }));
vi.mock('../model/restaurantSpecialVenue', () => ({ listSpecialVenues }));
listSpecialVenues.mockImplementation(async () => specials.map(({ regionSlug, ...profile }) => ({ regionSlug, profile })));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('./cache', () => ({ TAGS: { timeline: 'timeline' } }));
vi.mock('../db', () => ({ query }));
vi.mock('../model/pins', () => ({ default: {} }));
vi.mock('../model/pin', () => ({ default: { findBySourceUrls } }));
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

describe('regional restaurant data', () => {
  it('shows seeded Canadian guides in navigation and resolves their restaurant links', async () => {
    const canadian = catalog.filter((restaurant) => RESTAURANT_REGIONS.some((region) => region.country === 'Canada' && region.slug === restaurant.regionSlug));
    findBySourceUrls.mockResolvedValue(new Map(canadian.map((restaurant, index) => [restaurant.sourceUrl, { id: 93000 + index, title: restaurant.name }])));
    query.mockResolvedValue([]);
    const slugs = await restaurantGuideRegionSlugs();
    expect(slugs).toContain('toronto');
    expect(slugs).toContain('montreal');
    expect(slugs).toContain('vancouver');
    const toronto = await regionalTopRestaurants('toronto');
    expect(toronto.map((restaurant) => restaurant.name)).toEqual(['Alo', 'DaiLo', 'Richmond Station']);
    expect(toronto.every((restaurant) => restaurant.pinId >= 93000)).toBe(true);
  });
  it('discovers a newly managed city and removes it when its database offers disappear', async () => {
    findBySourceUrls.mockResolvedValue(new Map());
    query.mockResolvedValue([]);
    listSpecialVenues.mockResolvedValueOnce([{ regionSlug: 'vienna', profile: { specials: [{}] } }]).mockResolvedValueOnce([]);
    expect(await restaurantGuideRegionSlugs()).toContain('vienna');
    expect(await restaurantGuideRegionSlugs()).not.toContain('vienna');
  });
  it('excludes empty and expired guides while including live curated picks and visible openings', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    const paris = catalog.find((restaurant) => restaurant.regionSlug === 'paris' && restaurant.kind === 'top')!;
    findBySourceUrls.mockResolvedValue(new Map([[paris.sourceUrl, { id: 92000, title: paris.name }]]));
    query.mockResolvedValue([
      { city: 'San Antonio', day: '2026-01-01', dateConfidence: 'confirmed', sourceUrl: null },
      { city: 'Madrid', day: '2026-10-01', dateConfidence: 'confirmed', sourceUrl: null },
      { city: 'berlin', day: '2026-11-01', dateConfidence: 'estimated', sourceUrl: null },
      { city: 'Vienna', day: '2026-01-01', dateConfidence: 'estimated', sourceUrl: null },
    ]);
    expect(await restaurantGuideRegionSlugs()).toEqual([...RESTAURANT_REGIONS.filter((region) => region.country === 'United States' && !['sacramento', 'palm-springs'].includes(region.slug)).map((region) => region.slug), 'madrid', 'paris', 'berlin']);
    expect(query.mock.calls[0][0]).toContain('"utcDeletedDateTime" IS NULL');
    expect(query.mock.calls[0][0]).toContain("'Restaurant Opening'");
    expect(query.mock.calls[0][0]).toContain("'Food'");
  });

  it('keeps a verified month opening available only while it is within the guide window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    const opening = catalog.find((restaurant) => restaurant.regionSlug === 'barcelona' && restaurant.slug === 'mineral')!;
    findBySourceUrls.mockResolvedValue(new Map());
    query.mockResolvedValue([{ city: 'Barcelona', day: opening.day, dateConfidence: 'estimated', sourceUrl: opening.sourceUrl }]);
    expect(await restaurantGuideRegionSlugs()).toContain('barcelona');
    vi.setSystemTime(new Date('2027-10-07T12:00:00Z'));
    expect(await restaurantGuideRegionSlugs()).not.toContain('barcelona');
  });

  it('resolves European curated picks through real pins and preserves their photos', async () => {
    const tops = catalog.filter((restaurant) => restaurant.regionSlug === 'paris' && restaurant.kind === 'top');
    findBySourceUrls.mockResolvedValue(new Map(tops.map((restaurant, index) => [restaurant.sourceUrl, { id: 92000 + index, title: restaurant.name }])));
    const restaurants = await regionalTopRestaurants('paris');
    expect(restaurants).toHaveLength(3);
    expect(restaurants.every((restaurant) => restaurant.pinId >= 92000 && restaurant.image?.startsWith('https://chronopin.blob.core.windows.net/thumb/restaurant-images/paris/top/'))).toBe(true);
    expect(restaurants.every((restaurant) => restaurant.recognition === 'Chronopin selection')).toBe(true);
  });
  it('keeps an estimated European target upcoming and an independently verified month opening new', () => {
    const pinFor = (slug: string) => {
      const row = catalog.find((restaurant) => restaurant.regionSlug === 'berlin' && restaurant.slug === slug)
        ?? catalog.find((restaurant) => restaurant.regionSlug === 'barcelona' && restaurant.slug === slug)!;
      return { id: 1, title: row.name, sourceUrl: row.sourceUrl, utcStartDateTime: `${row.day}T00:00:00Z`, dateConfidence: row.dateConfidence } as PinJson;
    };
    expect(restaurantOf(pinFor('blue-pearl'), 'Berlin')).toMatchObject({ confirmed: false, dateLabel: 'Nov 2026', neighborhood: 'Nikolaiviertel' });
    expect(restaurantOf(pinFor('mineral'), 'Barcelona')).toMatchObject({ confirmed: true, dateLabel: 'Sep 2026', cuisine: 'Catalan' });
  });
  it('includes a sourced price tier on opening cards without assigning unknown venues a default', () => {
    const restaurant = catalog.find((row) => row.slug === 'one-bryant-park')!;
    const pin = { id: 1, title: restaurant.name, sourceUrl: restaurant.sourceUrl, utcStartDateTime: `${restaurant.day}T00:00:00Z` } as PinJson;
    expect(restaurantOf(pin, 'New York')?.priceRange).toBe('$$$');
    expect(restaurantOf({ ...pin, sourceUrl: 'https://example.com/unverified' }, 'New York')?.priceRange).toBeUndefined();
  });

  it('uses the requested city as a fallback and excludes city tags from neighborhoods', () => {
    const pin = { id: 1, title: 'An opening', utcStartDateTime: '2026-10-31T00:00:00Z', tags: [{ name: 'New York' }, { name: 'Restaurant' }, { name: 'Food' }, { name: 'French' }, { name: 'Restaurant Opening' }, { name: 'West Village' }] } as PinJson;
    expect(restaurantOf(pin, 'New York')).toMatchObject({ neighborhood: 'West Village', cuisine: 'French' });
    expect(restaurantOf({ ...pin, tags: [{ name: 'Los Angeles', kind: 'topic', source: 'user' }] }, 'Los Angeles')?.neighborhood).toBe('Los Angeles');
  });

  it('resolves top card links with database IDs and excludes unavailable pins', async () => {
    const tops = catalog.filter((restaurant) => restaurant.regionSlug === 'new-york' && restaurant.kind === 'top');
    findBySourceUrls.mockResolvedValue(new Map([[tops[0].sourceUrl, { id: 91234, title: 'A renamed restaurant guide' }]]));
    const restaurants = await regionalTopRestaurants('new-york');
    expect(findBySourceUrls).toHaveBeenCalledWith(tops.map((restaurant) => restaurant.sourceUrl));
    expect(restaurants).toHaveLength(1);
    expect(restaurants[0]).toMatchObject({ name: 'Le Bernardin', pinId: 91234, pinTitle: 'A renamed restaurant guide', regionSlug: 'new-york' });
  });

  it('separates a verified opening month from an exact opening date', () => {
    const restaurant = catalog.find((row) => row.slug === 'grandioso')!;
    const pin = { id: 1, title: restaurant.name, sourceUrl: restaurant.sourceUrl, utcStartDateTime: `${restaurant.day}T00:00:00Z`, dateConfidence: 'estimated', dateConfidenceReasoning: restaurant.dateConfidenceReasoning } as PinJson;
    expect(restaurantOf(pin, 'Phoenix')).toMatchObject({ confirmed: true, estimated: true, dateLabel: 'Sep 2026' });
    expect(restaurantOf({ ...pin, utcStartDateTime: '2026-11-30T00:00:00Z' }, 'Phoenix')?.confirmed).toBe(false);
    const planned = catalog.find((row) => row.slug === 'casa-pio')!;
    expect(restaurantOf({ ...pin, sourceUrl: planned.sourceUrl }, 'Dallas')?.confirmed).toBe(false);
  });
});
