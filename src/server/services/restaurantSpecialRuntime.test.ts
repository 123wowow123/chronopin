import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import venues from '@/server/data/restaurantSpecials.json';
import { listSpecialVenues, type RestaurantSpecialVenue } from '@/server/model/restaurantSpecialVenue';
import { regionalRestaurantOffers } from './restaurantOffers';
import { restaurantSpecialMap } from './restaurantSpecialMap';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';
import Pin from '@/server/model/pin';

vi.mock('@/server/model/restaurantSpecialVenue', () => ({ listSpecialVenues: vi.fn() }));
vi.mock('@/server/model/pin', () => ({ default: { findBySourceUrls: vi.fn().mockResolvedValue(new Map()) } }));
// Every venue has a backing pin unless a test says otherwise: cards open native pin pages.
beforeEach(() => vi.mocked(Pin.findBySourceUrls).mockImplementation(async (urls: string[]) => new Map(urls.map((url, index) => [url, { id: index + 1, title: 'Backing pin' }]))));
afterEach(() => vi.resetAllMocks());
function record(): RestaurantSpecialVenue {
  const { regionSlug, ...profile } = structuredClone(venues[0]);
  return { id: 1, ...parseSpecialVenue({ regionSlug, profile }), revision: 1, utcUpdatedDateTime: new Date() };
}
it('reads each request from the database and never resurrects removed/disabled catalog offers', async () => {
  const saved = record(); saved.profile.name = 'Database name';
  vi.mocked(listSpecialVenues).mockResolvedValueOnce([saved]).mockResolvedValueOnce([{ ...saved, enabled: false }]).mockResolvedValueOnce([]);
  expect((await regionalRestaurantOffers([], [], '2026-10-08', 'san-diego'))[0].name).toBe('Database name');
  expect(await regionalRestaurantOffers([], [], '2026-10-08', 'san-diego')).toEqual([]);
  expect(await regionalRestaurantOffers([], [], '2026-10-08', 'san-diego')).toEqual([]);
  expect(listSpecialVenues).toHaveBeenCalledTimes(3);
});
it('uses the same stored profile and original special indices for guide cards and map markers', async () => {
  const saved = record(); saved.profile.name = 'Updated restaurant';
  saved.profile.specials.unshift({ kind: 'other', title: 'Unscheduled', description: '', sourceUrl: saved.profile.pinSourceUrl });
  vi.mocked(listSpecialVenues).mockResolvedValue([saved]);
  const [offer] = await regionalRestaurantOffers([], [], '2026-10-08', 'san-diego');
  expect(offer.id).toBe(`${saved.profile.pinSourceUrl}#1`);
  expect((await restaurantSpecialMap([offer.id]))[0]).toMatchObject({ title: 'Updated restaurant', latitude: saved.profile.location!.latitude });
  vi.mocked(listSpecialVenues).mockResolvedValue([]);
  expect(await restaurantSpecialMap([offer.id])).toEqual([]);
});
it('resolves supplemental special venues to pin detail pages when pins exist', async () => {
  const saved = record();
  vi.mocked(listSpecialVenues).mockResolvedValue([saved]);
  vi.mocked(Pin.findBySourceUrls).mockResolvedValue(new Map([[saved.profile.pinSourceUrl, { id: 12345, title: 'Database pin title' }]]));
  const [offer] = await regionalRestaurantOffers([], [], '2026-10-08', 'san-diego');
  expect(offer.restaurantHref).toBe('/pin/12345/database-pin-title');
  const [mapPin] = await restaurantSpecialMap([offer.id]);
  expect(mapPin.restaurantHref).toBe('/pin/12345/database-pin-title');
});
it('hides offers and map markers whose venue has no backing pin', async () => {
  vi.mocked(listSpecialVenues).mockResolvedValue([record()]);
  vi.mocked(Pin.findBySourceUrls).mockResolvedValue(new Map());
  expect(await regionalRestaurantOffers([], [], '2026-10-08', 'san-diego')).toEqual([]);
});
