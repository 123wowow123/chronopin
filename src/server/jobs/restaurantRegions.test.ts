import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { restaurantRegionsToRefresh } from './signals';
import catalog from '../data/regionalRestaurants.json';

const { query, listRestaurantContent, listSpecialVenues, findBySourceUrls } = vi.hoisted(() => ({
  query: vi.fn(), listRestaurantContent: vi.fn(), listSpecialVenues: vi.fn(), findBySourceUrls: vi.fn(),
}));
vi.mock('../model/restaurantContent', () => ({ listRestaurantContent }));
vi.mock('../model/restaurantSpecialVenue', () => ({ listSpecialVenues }));
vi.mock('../model/pin', () => ({ default: { findBySourceUrls } }));
beforeEach(() => {
  listRestaurantContent.mockResolvedValue([]);
  listSpecialVenues.mockResolvedValue([]);
  findBySourceUrls.mockResolvedValue(new Map());
});
vi.mock('../db', () => ({ query }));
vi.mock('../model/pinView', () => ({ default: {} }));
vi.mock('../model/appSetting', () => ({ getTimelineConfidence: vi.fn() }));
vi.mock('../model/pins', () => ({ pinConfidenceOf: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); vi.useRealTimers(); });

describe('restaurant refresh coverage', () => {
  it('returns shortages with no new pins and counts only live catalog selections as top', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    const top = catalog.find((entry) => entry.regionSlug === 'paris' && entry.kind === 'top')!;
    const { sourceUrl, ...tile } = top;
    listRestaurantContent.mockResolvedValue([{ enabled: true, profile: { pinSourceUrl: sourceUrl, tile } }]);
    findBySourceUrls.mockResolvedValue(new Map([[sourceUrl, { id: 1, title: 'Restaurant' }]]));
    const common = { region: 'paris', created: new Date('2026-01-01T00:00:00Z'), dateConfidence: 'confirmed', title: 'Restaurant' };
    query.mockResolvedValue([
      { ...common, id: 1, day: '2026-09-01', sourceUrl: top.sourceUrl, opening: false },
      { ...common, id: 2, day: '2026-10-02', sourceUrl: 'https://example.com/open', opening: true },
      { ...common, id: 3, day: '2026-06-01', sourceUrl: 'https://example.com/old', opening: true },
      { ...common, id: 4, day: '2026-09-01', sourceUrl: 'https://example.com/unselected', opening: false },
    ]);
    const result = await restaurantRegionsToRefresh(new Date('2026-10-06T00:00:00Z'));
    expect(result.find((region) => region.slug === 'paris')).toMatchObject({
      newPins: [], targetPerTab: 12, counts: { upcoming: 0, new: 1, top: 1, discounts: 0 }, needed: { upcoming: 12, new: 11, top: 11, discounts: 12 },
    });
    expect(result.find((region) => region.slug === 'stockholm')).toMatchObject({ counts: { upcoming: 0, new: 0, top: 0, discounts: 0 } });
  });

  it('prioritizes a city with a new opening over an empty city', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T12:00:00Z'));
    query.mockResolvedValue([{ region: 'Paris', id: 1, title: 'New opening', created: new Date('2026-10-07T01:00:00Z'), day: '2026-11-01', dateConfidence: 'estimated', sourceUrl: null, opening: true }]);
    const result = await restaurantRegionsToRefresh(new Date('2026-10-06T00:00:00Z'));
    expect(result[0]).toMatchObject({ slug: 'paris', counts: { upcoming: 1, new: 0, top: 0 }, newPins: [{ id: 1 }] });
  });
  it('uses live China tiles and excludes archived content and deleted top pins', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T00:00:00Z'));
    const tile = { ...catalog.find((entry) => entry.kind === 'top')!, regionSlug: 'beijing' };
    listRestaurantContent.mockResolvedValue([
      { enabled: true, profile: { pinSourceUrl: 'https://example.com/new-top', tile } },
      { enabled: true, profile: { pinSourceUrl: 'https://example.com/deleted-top', tile } },
      { enabled: false, profile: { pinSourceUrl: 'https://example.com/archived', tile: { ...tile, kind: 'opening' } } },
      { enabled: true, profile: { pinSourceUrl: 'https://example.com/new-opening', tile: { ...tile, kind: 'opening', day: '2026-10-01', openingConfirmed: true } } },
    ]);
    findBySourceUrls.mockResolvedValue(new Map([['https://example.com/new-top', { id: 1, title: 'New top selection' }]]));
    const pin = { region: null, created: new Date('2026-01-01'), day: '2026-10-01', dateConfidence: 'estimated', title: 'Opening', opening: false };
    query.mockResolvedValue([
      { ...pin, id: 2, sourceUrl: 'https://example.com/new-opening' },
      { ...pin, id: 2, sourceUrl: 'https://example.com/new-opening' },
      { ...pin, id: 3, sourceUrl: 'https://example.com/archived' },
    ]);
    const result = await restaurantRegionsToRefresh(new Date('2026-10-10T00:00:00Z'));
    expect(result.find((region) => region.slug === 'beijing')).toMatchObject({
      targetPerTab: 35, counts: { upcoming: 0, new: 1, top: 1, discounts: 0 },
      needed: { upcoming: 35, new: 34, top: 34, discounts: 35 },
    });
  });

  it('counts China specials outside service hours once per restaurant and excludes expired offers', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T00:00:00Z')); // 08:00 in Beijing, before service.
    query.mockResolvedValue([]);
    const special = { kind: 'other', title: 'Lunch offer', description: 'Verified offer', sourceUrl: 'https://example.com/offer', discounted: true,
      availability: { windows: [{ days: [0, 1, 2, 3, 4, 5, 6], start: '12:00', end: '14:00' }] } };
    const profile = { pinSourceUrl: 'https://example.com/venue', name: 'Venue', websiteUrl: 'https://example.com/venue', neighborhood: 'Area', address: 'Address', checkedAt: '2026-10-11', menus: [], specials: [special, { ...special, title: 'Second offer' }] };
    listSpecialVenues.mockResolvedValue([
      { enabled: true, regionSlug: 'beijing', profile },
      { enabled: true, regionSlug: 'beijing', profile: { ...profile, pinSourceUrl: 'https://example.com/expired', websiteUrl: 'https://example.com/expired', specials: [{ ...special, validThrough: '2026-10-10' }] } },
      { enabled: false, regionSlug: 'beijing', profile: { ...profile, pinSourceUrl: 'https://example.com/disabled' } },
    ]);
    const result = await restaurantRegionsToRefresh(new Date('2026-10-10T00:00:00Z'));
    expect(result.find((region) => region.slug === 'beijing')).toMatchObject({ targetPerTab: 35, counts: { discounts: 1 }, needed: { discounts: 34 } });
  });
});
