import { describe, expect, it } from 'vitest';
import { restaurantDistance, sortRestaurants, type RestaurantDetails } from './restaurantSort';

const rows = [
  { id: 'unknown', details: {} },
  { id: 'near', details: { rating: { score: 4, scoreMax: 5, source: 'A' }, location: { latitude: 32, longitude: -117 } } },
  { id: 'far', details: { rating: { score: 9, scoreMax: 10, source: 'B' }, location: { latitude: 33, longitude: -118 } } },
] satisfies { id: string; details: RestaurantDetails }[];
describe('restaurant tab sorting', () => {
  it('sorts expected opening dates chronologically with unknown dates last', () => {
    const openings = [{ day: undefined }, { day: '2027-01-01' }, { day: '2026-11-10' }, { day: '2026-10-31' }];
    expect(sortRestaurants(openings, () => ({}), 'opening-date', undefined, (r) => r.day).map((r) => r.day)).toEqual(['2026-10-31', '2026-11-10', '2027-01-01', undefined]);
  });
  it('normalizes published rating scales and keeps unrated restaurants last', () => {
    expect(sortRestaurants(rows, (r) => r.details, 'rating').map((r) => r.id)).toEqual(['far', 'near', 'unknown']);
    expect(rows[0].id).toBe('unknown');
  });
  it('sorts by distance with missing coordinates last', () => {
    expect(sortRestaurants(rows, (r) => r.details, 'distance', { latitude: 32, longitude: -117 }).map((r) => r.id)).toEqual(['near', 'far', 'unknown']);
  });
  it('preserves guide order when values tie or are missing', () => {
    expect(sortRestaurants(rows, () => ({}), 'rating')).toEqual(rows);
    expect(sortRestaurants(rows, (r) => r.details, 'distance')).toEqual(rows);
    expect(restaurantDistance({ location: { latitude: 91, longitude: 0 } }, { latitude: 0, longitude: 0 })).toBeUndefined();
  });
});
