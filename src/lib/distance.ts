// How far apart two places on the map are, and how to say it.

import { INTL_LOCALES, type Locale } from './i18n/config';

export type Place = { latitude: number; longitude: number };

const EARTH_RADIUS_KM = 6371;
const KM_PER_MILE = 1.609344;

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
