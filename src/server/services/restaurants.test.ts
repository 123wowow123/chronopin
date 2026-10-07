import { afterEach, describe, expect, it, vi } from 'vitest';
import { regionalTopRestaurants, restaurantOf } from './restaurants';
import type { PinJson } from '@/lib/types';
import catalog from '@/server/data/regionalRestaurants.json';

const { findBySourceUrls } = vi.hoisted(() => ({ findBySourceUrls: vi.fn() }));
vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('./cache', () => ({ TAGS: { timeline: 'timeline' } }));
vi.mock('../db', () => ({ query: vi.fn() }));
vi.mock('../model/pins', () => ({ default: {} }));
vi.mock('../model/pin', () => ({ default: { findBySourceUrls } }));
afterEach(() => { vi.clearAllMocks(); });

describe('regional restaurant data', () => {
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
