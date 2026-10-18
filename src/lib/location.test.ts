import { describe, expect, it } from 'vitest';
import { hasMoved, locationProblem, roundCoordinate, userLocation } from './location';

describe('locationProblem', () => {
  it('takes a point in range, with or without a name', () => {
    expect(locationProblem({ latitude: 40.68, longitude: -73.94 })).toBeUndefined();
    expect(locationProblem({ latitude: -90, longitude: 180, name: 'Somewhere' })).toBeUndefined();
  });

  it('refuses what is not a point', () => {
    expect(locationProblem({ latitude: 95, longitude: 0 })).toBe('latitude');
    expect(locationProblem({ latitude: '40', longitude: 0 })).toBe('latitude');
    expect(locationProblem({ latitude: 0, longitude: -181 })).toBe('longitude');
    expect(locationProblem({ latitude: 0, longitude: Number.NaN })).toBe('longitude');
    expect(locationProblem({ latitude: 0, longitude: 0, name: 'x'.repeat(201) })).toBe('name');
  });
});

describe('roundCoordinate', () => {
  it('keeps two decimals, about a kilometre', () => {
    expect(roundCoordinate(40.678234)).toBe(40.68);
    expect(roundCoordinate(-73.944158)).toBe(-73.94);
  });
});

describe('userLocation', () => {
  it('reads the saved point, or null when there is none', () => {
    expect(userLocation({ locationLatitude: 45.52, locationLongitude: -122.68, locationName: 'Portland' })).toEqual({ latitude: 45.52, longitude: -122.68, name: 'Portland' });
    expect(userLocation({ locationLatitude: 45.52, locationLongitude: -122.68 })).toEqual({ latitude: 45.52, longitude: -122.68, name: null });
    expect(userLocation({ locationLatitude: null, locationLongitude: null })).toBeNull();
    expect(userLocation(null)).toBeNull();
  });
});

describe('hasMoved', () => {
  it('moves the saved point only once the device is a few kilometres away', () => {
    const brooklyn = { latitude: 40.68, longitude: -73.94 };
    expect(hasMoved(null, brooklyn)).toBe(true);
    expect(hasMoved(brooklyn, { latitude: 40.69, longitude: -73.95 })).toBe(false);
    expect(hasMoved(brooklyn, { latitude: 40.76, longitude: -73.98 })).toBe(true);
  });
});
