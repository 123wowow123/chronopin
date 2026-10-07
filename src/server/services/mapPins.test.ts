import { afterEach, describe, expect, it, vi } from 'vitest';
import { mapPins, type MapQuery } from './mapPins';
import snapshot from '@/server/data/sanDiegoRestaurants.preview.json';

const { search, queryForMap } = vi.hoisted(() => ({ search: vi.fn(), queryForMap: vi.fn() }));
vi.mock('./search', () => ({ searchPins: search }));
vi.mock('../model/pins', () => ({ default: { queryForMap } }));
vi.mock('./timeline', () => ({ timelineMinConfidence: vi.fn() }));

const query: MapQuery = { from: null, to: null, createdSince: null, q: 'pin:6427,6431', onlyWatched: false, userId: null, timeZone: 'America/Los_Angeles' };
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe('restaurant map previews', () => {
  it('filters the restaurant layer and includes all local restaurant previews', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    queryForMap.mockImplementation(async () => []);
    const pins = await mapPins({ ...query, q: '', restaurantsOnly: true });
    expect(queryForMap).toHaveBeenCalledWith(expect.objectContaining({ restaurantsOnly: true }));
    expect(pins).toHaveLength(18);
    expect(pins.every((pin) => pin.categories?.includes('Food') && pin.latitude != null && pin.longitude != null)).toBe(true);
    expect(await mapPins({ ...query, q: '', restaurantsOnly: true, onlyWatched: true, userId: 1 })).toEqual([]);
    vi.stubEnv('NODE_ENV', 'production');
    expect(await mapPins({ ...query, q: '', restaurantsOnly: true })).toEqual([]);
  });

  it('excludes other food pins from restaurant searches', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    search.mockResolvedValue({ pins: [snapshot[0], { ...snapshot[1], tags: [{ name: 'Recipes' }] }] });
    const pins = await mapPins({ ...query, restaurantsOnly: true });
    expect(pins.map((pin) => pin.id)).toEqual([snapshot[0].id]);
  });

  it('supplies coordinates for requested restaurant IDs missing locally', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    search.mockResolvedValue({ pins: [] });
    const pins = await mapPins(query);
    expect(pins.map((pin) => pin.id)).toEqual([6427, 6431]);
    expect(pins.every((pin) => pin.latitude != null && pin.longitude != null)).toBe(true);
  });

  it('keeps stored pins and does not duplicate them', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    search.mockResolvedValue({ pins: [{ ...snapshot[0], title: 'Stored title' }] });
    const pins = await mapPins(query);
    expect(pins).toHaveLength(2);
    expect(pins.find((pin) => pin.id === 6427)?.title).toBe('Stored title');
  });

  it('includes established top restaurant pins in the local map', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    search.mockResolvedValue({ pins: [] });
    const pins = await mapPins({ ...query, q: 'pin:6439,6444' });
    expect(pins.map((pin) => pin.id)).toEqual([6439, 6444]);
    expect(pins.every((pin) => pin.latitude != null && pin.longitude != null)).toBe(true);
  });

  it('respects time and posted-date filters for previews', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    search.mockImplementation(async () => ({ pins: [] }));
    expect(await mapPins({ ...query, to: new Date('2026-10-01') })).toEqual([]);
    expect(await mapPins({ ...query, createdSince: new Date('2026-10-07') })).toEqual([]);
  });

  it('does not supplement watched searches, searches with other filters, or production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    search.mockImplementation(async () => ({ pins: [] }));
    expect(await mapPins({ ...query, onlyWatched: true, userId: 1 })).toEqual([]);
    expect(await mapPins({ ...query, q: 'pin:6427 tag:Italian' })).toEqual([]);
    vi.stubEnv('NODE_ENV', 'production');
    expect(await mapPins(query)).toEqual([]);
  });
});
