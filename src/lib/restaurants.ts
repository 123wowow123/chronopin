import { distanceKm, type Place } from './distance';

// City navigation runs west to east by city-center longitude.
export const RESTAURANT_REGIONS = [
  { slug: 'san-francisco', name: 'San Francisco', state: 'California', timeZone: 'America/Los_Angeles', latitude: 37.7749, longitude: -122.4194 },
  { slug: 'seattle', name: 'Seattle', state: 'Washington', timeZone: 'America/Los_Angeles', latitude: 47.6062, longitude: -122.3321 },
  { slug: 'san-jose', name: 'San Jose', state: 'California', timeZone: 'America/Los_Angeles', latitude: 37.3382, longitude: -121.8863 },
  { slug: 'los-angeles', name: 'Los Angeles', state: 'California', timeZone: 'America/Los_Angeles', latitude: 34.0522, longitude: -118.2437 },
  { slug: 'san-diego', name: 'San Diego', state: 'California', timeZone: 'America/Los_Angeles', latitude: 32.7157, longitude: -117.1611 },
  { slug: 'phoenix', name: 'Phoenix', state: 'Arizona', timeZone: 'America/Phoenix', latitude: 33.4484, longitude: -112.074 },
  { slug: 'san-antonio', name: 'San Antonio', state: 'Texas', timeZone: 'America/Chicago', latitude: 29.4241, longitude: -98.4936 },
  { slug: 'austin', name: 'Austin', state: 'Texas', timeZone: 'America/Chicago', latitude: 30.2672, longitude: -97.7431 },
  { slug: 'fort-worth', name: 'Fort Worth', state: 'Texas', timeZone: 'America/Chicago', latitude: 32.7555, longitude: -97.3308 },
  { slug: 'dallas', name: 'Dallas', state: 'Texas', timeZone: 'America/Chicago', latitude: 32.7767, longitude: -96.797 },
  { slug: 'houston', name: 'Houston', state: 'Texas', timeZone: 'America/Chicago', latitude: 29.7604, longitude: -95.3698 },
  { slug: 'chicago', name: 'Chicago', state: 'Illinois', timeZone: 'America/Chicago', latitude: 41.8781, longitude: -87.6298 },
  { slug: 'columbus', name: 'Columbus', state: 'Ohio', timeZone: 'America/New_York', latitude: 39.9612, longitude: -82.9988 },
  { slug: 'jacksonville', name: 'Jacksonville', state: 'Florida', timeZone: 'America/New_York', latitude: 30.3322, longitude: -81.6557 },
  { slug: 'charlotte', name: 'Charlotte', state: 'North Carolina', timeZone: 'America/New_York', latitude: 35.2271, longitude: -80.8431 },
  { slug: 'miami', name: 'Miami', state: 'Florida', timeZone: 'America/New_York', latitude: 25.7617, longitude: -80.1918 },
  { slug: 'philadelphia', name: 'Philadelphia', state: 'Pennsylvania', timeZone: 'America/New_York', latitude: 39.9526, longitude: -75.1652 },
  { slug: 'new-york', name: 'New York', state: 'New York', timeZone: 'America/New_York', latitude: 40.7128, longitude: -74.006 },
  { slug: 'boston', name: 'Boston', state: 'Massachusetts', timeZone: 'America/New_York', latitude: 42.3601, longitude: -71.0589 },
] as const;

// Only supported city guides are candidates. With no usable location, use San Diego.
export function nearestRestaurantRegion(place: Place | null | undefined) {
  const fallback = RESTAURANT_REGIONS.find((region) => region.slug === 'san-diego')!;
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude) || Math.abs(place.latitude) > 90 || Math.abs(place.longitude) > 180) return fallback;
  return RESTAURANT_REGIONS.reduce((nearest, region) =>
    distanceKm(place, region) < distanceKm(place, nearest) ? region : nearest,
  );
}

export type Restaurant = {
  id: number;
  title: string;
  name: string;
  description: string;
  day: string;
  dateLabel: string;
  estimated: boolean;
  confirmed: boolean;
  neighborhood: string;
  cuisine: string;
  image: string | null;
  imageNote: string | null;
  address: string;
  priceRange?: string;
};

export type OpeningGroup = 'upcoming' | 'new' | null;

export type TopRestaurant = {
  pinId: number;
  pinTitle: string;
  slug: string;
  regionSlug: string;
  name: string;
  cuisine: string;
  neighborhood: string;
  address: string;
  description: string;
  recognition: string;
  priceRange: string;
  sourceUrl: string;
  websiteUrl: string;
  checkedAt: string;
  image: string | null;
  imageCredit: string;
};

// Passing an estimated opening date never establishes that a restaurant opened.
// All-day pin dates are calendar days; compare them with the region's local day.
export function openingGroup(restaurant: Pick<Restaurant, 'day' | 'confirmed'>, today: string): OpeningGroup {
  if (restaurant.day > today) return 'upcoming';
  const oldest = new Date(`${today}T00:00:00Z`);
  oldest.setUTCDate(oldest.getUTCDate() - 90);
  if (restaurant.day < oldest.toISOString().slice(0, 10)) return null;
  return restaurant.confirmed ? 'new' : 'upcoming';
}

export function openingDateLabel(day: string, estimated: boolean, reason = ''): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (estimated) {
    if (/early winter/i.test(reason)) return `Early winter ${date.getUTCFullYear()}`;
    if (/early\s+\d{4}/i.test(reason)) return `Early ${date.getUTCFullYear()}`;
    if (/fall/i.test(reason) && !/October/i.test(reason)) return `Fall ${date.getUTCFullYear()}`;
    if (/late.?2026/i.test(reason)) return 'Late 2026';
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', ...(estimated ? {} : { day: 'numeric' }), year: 'numeric', timeZone: 'UTC' }).format(date);
}
