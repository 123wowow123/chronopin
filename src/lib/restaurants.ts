export const RESTAURANT_REGIONS = [{ slug: 'san-diego', name: 'San Diego', state: 'California', timeZone: 'America/Los_Angeles' }] as const;

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
  image: string;
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
    if (/fall/i.test(reason) && !/October/i.test(reason)) return `Fall ${date.getUTCFullYear()}`;
    if (/late.?2026/i.test(reason)) return 'Late 2026';
  }
  return new Intl.DateTimeFormat('en-US', { month: 'short', ...(estimated ? {} : { day: 'numeric' }), year: 'numeric', timeZone: 'UTC' }).format(date);
}
