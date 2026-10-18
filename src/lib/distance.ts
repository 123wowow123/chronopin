// How far apart two places on the map are, and how to say it.

import { INTL_LOCALES, type Locale } from './i18n/config';

export type Place = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;
export const KM_PER_MILE = 1.609344;

const rad = (degrees: number) => (degrees * Math.PI) / 180;

// The great-circle distance in kilometres (haversine): the way a distance is
// read off a map, over the ground rather than through it.
export function distanceKm(from: Place, to: Place): number {
  const dLat = rad(to.latitude - from.latitude);
  const dLon = rad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.latitude)) * Math.cos(rad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  // min(1, …): a rounding error over 1 would make asin NaN for two places
  // on opposite sides of the world.
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

// "770 mi", "1,240 km", "1.240 km" in German. A short hop keeps a decimal,
// which the unit only earns while it is worth something: nobody reads
// "1,240.4 km".
export function formatDistance(km: number, imperial: boolean, locale: Locale = 'en'): string {
  const value = imperial ? km / KM_PER_MILE : km;
  return new Intl.NumberFormat(INTL_LOCALES[locale], {
    style: 'unit',
    unit: imperial ? 'mile' : 'kilometer',
    unitDisplay: 'short',
    maximumFractionDigits: value < 10 ? 1 : 0,
  }).format(value);
}

// The line that distance was measured along, as points to draw: the great
// circle, which on a flat map is a curve, so the drawn line matches the
// kilometres beside it rather than the shortest path across the projection.
//
// Longitudes come back unwrapped — they run past ±180 rather than jumping to
// the other edge — so a path over the Pacific is one continuous line.
export function greatCirclePoints(from: Place, to: Place, steps = 64): [number, number][] {
  const vector = ({ latitude, longitude }: Place) => {
    const [lat, lon] = [rad(latitude), rad(longitude)];
    return [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)] as const;
  };
  const a = vector(from);
  const b = vector(to);
  const omega = Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  // The same place, or two poles apart: no one circle joins them, and a
  // straight segment is the honest drawing of either.
  if (!(omega > 1e-9) || Math.PI - omega < 1e-9) {
    return [[from.latitude, from.longitude], [to.latitude, to.longitude]];
  }

  const points: [number, number][] = [];
  let previous = from.longitude;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const [p, q] = [Math.sin((1 - f) * omega) / Math.sin(omega), Math.sin(f * omega) / Math.sin(omega)];
    const [x, y, z] = [p * a[0] + q * b[0], p * a[1] + q * b[1], p * a[2] + q * b[2]];
    const latitude = (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI;
    let longitude = (Math.atan2(y, x) * 180) / Math.PI;
    // Kept on the same copy of the world as the point before it.
    longitude += 360 * Math.round((previous - longitude) / 360);
    previous = longitude;
    points.push([latitude, longitude]);
  }
  return points;
}
