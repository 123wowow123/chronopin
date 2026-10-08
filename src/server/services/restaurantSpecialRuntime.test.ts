import { afterEach, expect, it, vi } from 'vitest';
import venues from '@/server/data/restaurantSpecials.json';
import { listSpecialVenues, type RestaurantSpecialVenue } from '@/server/model/restaurantSpecialVenue';
import { regionalRestaurantOffers } from './restaurantOffers';
import { restaurantSpecialMap } from './restaurantSpecialMap';
import { parseSpecialVenue } from '@/server/restaurantSpecialValidation';

vi.mock('@/server/model/restaurantSpecialVenue', () => ({ listSpecialVenues: vi.fn() }));
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
