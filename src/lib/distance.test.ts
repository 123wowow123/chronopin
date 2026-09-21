import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistance } from './distance';

const NEW_YORK = { latitude: 40.71, longitude: -74.01 };
const LONDON = { latitude: 51.51, longitude: -0.13 };
const SYDNEY = { latitude: -33.87, longitude: 151.21 };

describe('distanceKm', () => {
  it('measures over the ground', () => {
    // The published great-circle distances, to the kilometre.
    expect(distanceKm(NEW_YORK, LONDON)).toBeCloseTo(5570, -1);
    expect(distanceKm(LONDON, SYDNEY)).toBeCloseTo(16995, -2);
  });

  it('reads the same in either direction, and is nothing to itself', () => {
    expect(distanceKm(SYDNEY, NEW_YORK)).toBeCloseTo(distanceKm(NEW_YORK, SYDNEY), 6);
    expect(distanceKm(LONDON, LONDON)).toBe(0);
  });

  it('crosses the date line the short way', () => {
    expect(distanceKm({ latitude: 0, longitude: 179.5 }, { latitude: 0, longitude: -179.5 })).toBeCloseTo(111, 0);
  });

  it('answers for two places on opposite sides of the world', () => {
    expect(distanceKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 })).toBeCloseTo(20015, 0);
    expect(distanceKm({ latitude: 90, longitude: 0 }, { latitude: -90, longitude: 0 })).toBeCloseTo(20015, 0);
  });
});

describe('formatDistance', () => {
  it('names the unit the viewer reads', () => {
    expect(formatDistance(1240, false)).toBe('1,240 km');
    expect(formatDistance(1240, true)).toBe('771 mi');
  });

  it('keeps a decimal only while it is worth something', () => {
    expect(formatDistance(3.24, false)).toBe('3.2 km');
    expect(formatDistance(0.4, false)).toBe('0.4 km');
    expect(formatDistance(12.6, false)).toBe('13 km');
  });

  it('writes the figure in the page language', () => {
    expect(formatDistance(1240, false, 'de')).toBe('1.240 km');
  });
});
