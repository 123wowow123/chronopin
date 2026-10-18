import { describe, expect, it } from 'vitest';
import { distanceKm, formatDistance, greatCirclePoints } from './distance';

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

describe('greatCirclePoints', () => {
  it('starts and ends at the two places', () => {
    const points = greatCirclePoints(NEW_YORK, LONDON, 8);
    expect(points).toHaveLength(9);
    expect(points[0][0]).toBeCloseTo(NEW_YORK.latitude, 6);
    expect(points[0][1]).toBeCloseTo(NEW_YORK.longitude, 6);
    expect(points[8][0]).toBeCloseTo(LONDON.latitude, 6);
    expect(points[8][1]).toBeCloseTo(LONDON.longitude, 6);
  });

  it('curves poleward of the straight line', () => {
    // The New York-London circle passes well north of both cities' latitudes
    // read off a flat map: the drawn curve is what makes the figure honest.
    const middle = greatCirclePoints(NEW_YORK, LONDON, 64)[32];
    expect(middle[0]).toBeGreaterThan(Math.max(NEW_YORK.latitude, LONDON.latitude));
  });

  it('follows the measured distance', () => {
    // Every step is the same length, and they add up to the haversine figure.
    const points = greatCirclePoints(NEW_YORK, SYDNEY, 32);
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      total += distanceKm(
        { latitude: points[i - 1][0], longitude: points[i - 1][1] },
        { latitude: points[i][0], longitude: points[i][1] },
      );
    }
    expect(total).toBeCloseTo(distanceKm(NEW_YORK, SYDNEY), 0);
  });

  it('runs past the antimeridian rather than jumping back', () => {
    const points = greatCirclePoints({ latitude: 0, longitude: 170 }, { latitude: 0, longitude: -170 }, 8);
    expect(points[8][1]).toBeCloseTo(190, 6);
    for (let i = 1; i < points.length; i++) expect(Math.abs(points[i][1] - points[i - 1][1])).toBeLessThan(180);
  });

  it('draws a segment where no one circle is meant', () => {
    expect(greatCirclePoints(LONDON, LONDON)).toEqual([
      [LONDON.latitude, LONDON.longitude],
      [LONDON.latitude, LONDON.longitude],
    ]);
    const poles = greatCirclePoints({ latitude: 90, longitude: 0 }, { latitude: -90, longitude: 0 });
    expect(poles).toHaveLength(2);
  });
});
