// Seasonal activities for major US cities: the catalog shape, the city list
// (west to east, like the restaurant guides) and the season maths behind the
// "Today" section. Every activity is backed by a Pin whose sourceUrl matches.

import { distanceKm, type Place } from './distance';

export const SEASONS = ['winter', 'spring', 'summer', 'fall'] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_LABELS: Record<Season, string> = { winter: 'Winter', spring: 'Spring', summer: 'Summer', fall: 'Fall' };
const SEASON_MONTHS: Record<Season, readonly number[]> = { winter: [12, 1, 2], spring: [3, 4, 5], summer: [6, 7, 8], fall: [9, 10, 11] };

export const ACTIVITY_CATEGORIES = ['outdoor', 'family', 'festival', 'sports', 'arts', 'food', 'wellness', 'holiday'] as const;
export type ActivityCategoryId = (typeof ACTIVITY_CATEGORIES)[number];
export const TRIP_LABELS = { 'day-trips': 'Day trips', 'two-day-trips': '2-day trips' } as const;
export type ActivityTripTab = keyof typeof TRIP_LABELS;
export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategoryId, string> = {
  outdoor: 'Outdoors',
  family: 'Family',
  festival: 'Festivals',
  sports: 'Sports',
  arts: 'Arts & culture',
  food: 'Food & drink',
  wellness: 'Wellness',
  holiday: 'Holidays',
};

export type ActivityCatalogItem = {
  citySlug: string;
  slug: string;
  name: string;
  venue: string;
  neighborhood: string;
  address: string;
  latitude: number;
  longitude: number;
  seasons: Season[];
  startMonth: number;
  endMonth: number;
  startDate: string | null;
  endDate: string | null;
  category: ActivityCategoryId;
  description: string;
  sourceUrl: string;
  costNote: string | null;
  dateConfidence: 'confirmed' | 'estimated';
  dateReasoning: string;
  checkedAt: string;
  // Editorial planning suggestions, not operator tour durations or travel times.
  tripDays?: (1 | 2)[];
};

export function activitiesForTrip<T extends { activity: Pick<ActivityCatalogItem, 'tripDays'> }>(pins: readonly T[], days: 1 | 2): T[] {
  return pins.filter((pin) => pin.activity.tripDays?.includes(days));
}

// Cities ordered by city-center longitude, west to east.
export const ACTIVITY_CITIES = [
  { slug: 'san-francisco', name: 'San Francisco', state: 'CA', timeZone: 'America/Los_Angeles', latitude: 37.7749, longitude: -122.4194 },
  { slug: 'seattle', name: 'Seattle', state: 'WA', timeZone: 'America/Los_Angeles', latitude: 47.6062, longitude: -122.3321 },
  { slug: 'los-angeles', name: 'Los Angeles', state: 'CA', timeZone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437 },
  { slug: 'san-diego', name: 'San Diego', state: 'CA', timeZone: 'America/Los_Angeles', latitude: 32.7157, longitude: -117.1611 },
  { slug: 'las-vegas', name: 'Las Vegas', state: 'NV', timeZone: 'America/Los_Angeles', latitude: 36.1699, longitude: -115.1398 },
  { slug: 'phoenix', name: 'Phoenix', state: 'AZ', timeZone: 'America/Phoenix', latitude: 33.4484, longitude: -112.074 },
  { slug: 'denver', name: 'Denver', state: 'CO', timeZone: 'America/Denver', latitude: 39.7392, longitude: -104.9903 },
  { slug: 'san-antonio', name: 'San Antonio', state: 'TX', timeZone: 'America/Chicago', latitude: 29.4241, longitude: -98.4936 },
  { slug: 'austin', name: 'Austin', state: 'TX', timeZone: 'America/Chicago', latitude: 30.2672, longitude: -97.7431 },
  { slug: 'dallas', name: 'Dallas', state: 'TX', timeZone: 'America/Chicago', latitude: 32.7767, longitude: -96.797 },
  { slug: 'houston', name: 'Houston', state: 'TX', timeZone: 'America/Chicago', latitude: 29.7604, longitude: -95.3698 },
  { slug: 'minneapolis', name: 'Minneapolis', state: 'MN', timeZone: 'America/Chicago', latitude: 44.9778, longitude: -93.265 },
  { slug: 'chicago', name: 'Chicago', state: 'IL', timeZone: 'America/Chicago', latitude: 41.8781, longitude: -87.6298 },
  { slug: 'nashville', name: 'Nashville', state: 'TN', timeZone: 'America/Chicago', latitude: 36.1627, longitude: -86.7816 },
  { slug: 'atlanta', name: 'Atlanta', state: 'GA', timeZone: 'America/New_York', latitude: 33.749, longitude: -84.388 },
  { slug: 'miami', name: 'Miami', state: 'FL', timeZone: 'America/New_York', latitude: 25.7617, longitude: -80.1918 },
  { slug: 'washington-dc', name: 'Washington, DC', state: 'DC', timeZone: 'America/New_York', latitude: 38.9072, longitude: -77.0369 },
  { slug: 'philadelphia', name: 'Philadelphia', state: 'PA', timeZone: 'America/New_York', latitude: 39.9526, longitude: -75.1652 },
  { slug: 'new-york', name: 'New York', state: 'NY', timeZone: 'America/New_York', latitude: 40.7128, longitude: -74.006 },
  { slug: 'boston', name: 'Boston', state: 'MA', timeZone: 'America/New_York', latitude: 42.3601, longitude: -71.0589 },
] as const;

export type ActivityCity = (typeof ACTIVITY_CITIES)[number];

export const DEFAULT_ACTIVITY_RADIUS_KM = 250;
export const ACTIVITY_RADII_KM = [50, 100, 150, 250, 400] as const;

// Search the whole catalog by location, including outings assigned to another guide.
export function activitiesNearCity<T extends { activity: Pick<ActivityCatalogItem, 'latitude' | 'longitude'> }>(
  pins: readonly T[], city: Place, radiusKm = DEFAULT_ACTIVITY_RADIUS_KM,
): T[] {
  return pins.filter((pin) => distanceKm(city, pin.activity) <= radiusKm);
}

export function activityCity(slug: string): ActivityCity | undefined {
  return ACTIVITY_CITIES.find((city) => city.slug === slug);
}

export function nearestActivityCity(place: Place | null | undefined): ActivityCity {
  const fallback = ACTIVITY_CITIES.find((city) => city.slug === 'new-york')!;
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return fallback;
  return ACTIVITY_CITIES.reduce((nearest, city) => (distanceKm(place, city) < distanceKm(place, nearest) ? city : nearest));
}

export function seasonOfMonth(month: number): Season {
  return SEASONS.find((season) => SEASON_MONTHS[season].includes(month)) ?? 'winter';
}

// The local calendar day in a time zone, as { year, month, day, iso }.
export function localDay(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)!.value);
  const [year, month, day] = [get('year'), get('month'), get('day')];
  return { year, month, day, iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` };
}

export function monthInWindow(month: number, startMonth: number, endMonth: number): boolean {
  return startMonth <= endMonth ? month >= startMonth && month <= endMonth : month >= startMonth || month <= endMonth;
}

type Window = Pick<ActivityCatalogItem, 'startMonth' | 'endMonth' | 'startDate' | 'endDate'>;

// Exact dates govern their own cycle. Only a later annual cycle may use the
// typical month window, so an event doesn't appear before opening or after closing.
export function isActiveOn(item: Window, day: { month: number; iso: string }): boolean {
  if (item.startDate && item.endDate) {
    if (day.iso <= item.endDate) return day.iso >= item.startDate;
    const annual = { ...item, startDate: null, endDate: null };
    const cycle = windowStart(annual, { ...day, year: Number(day.iso.slice(0, 4)) });
    return monthInWindow(day.month, item.startMonth, item.endMonth) && cycle > item.endDate;
  }
  return monthInWindow(day.month, item.startMonth, item.endMonth);
}

// Next time the window opens, or the current opening when it is running now (YYYY-MM-DD).
export function windowStart(item: Window, day: { year: number; month: number; iso: string }): string {
  if (item.startDate && item.endDate && item.endDate >= day.iso) return item.startDate;
  const pad = (n: number) => String(n).padStart(2, '0');
  const running = monthInWindow(day.month, item.startMonth, item.endMonth);
  if (running) {
    // Opened this year, or last year when the window wraps the new year and we are in its tail.
    const year = item.startMonth <= day.month ? day.year : day.year - 1;
    return `${year}-${pad(item.startMonth)}-01`;
  }
  const year = item.startMonth > day.month ? day.year : day.year + 1;
  return `${year}-${pad(item.startMonth)}-01`;
}

// Last day of the cycle that windowStart picks.
export function windowEnd(item: Window, startIso: string): string {
  if (item.startDate && item.endDate && startIso === item.startDate) return item.endDate;
  const startYear = Number(startIso.slice(0, 4));
  const endYear = item.startMonth <= item.endMonth ? startYear : startYear + 1;
  const last = new Date(Date.UTC(endYear, item.endMonth, 0)).getUTCDate();
  return `${endYear}-${String(item.endMonth).padStart(2, '0')}-${String(last).padStart(2, '0')}`;
}

export function formatWindow(item: Window): string {
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return item.startMonth === item.endMonth ? names[item.startMonth - 1]! : `${names[item.startMonth - 1]} – ${names[item.endMonth - 1]}`;
}
