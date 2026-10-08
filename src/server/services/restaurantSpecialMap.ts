import type { RestaurantMenuProfile } from '@/lib/restaurantMenus';
import type { MapPinJson } from '@/lib/types';
import menus from '@/server/data/restaurantMenus.json';
import specials from '@/server/data/restaurantSpecials.json';

type Venue = RestaurantMenuProfile & { address?: string; websiteUrl?: string };

// Resolve only known curated offers. Never accept marker coordinates or links
// from the URL. This also covers venues not yet stored as database pins.
export function restaurantSpecialMap(ids: string[]): MapPinJson[] {
  const requested = new Set(ids);
  const venues = new Map<string, Venue>();
  for (const venue of [...menus, ...specials] as Venue[]) venues.set(venue.pinSourceUrl, venue);
  return [...venues.values()].flatMap((venue, index) => {
    const matches = venue.specials.filter((special, specialIndex) => special.discounted && requested.has(`${venue.pinSourceUrl}#${specialIndex}`));
    const location = venue.location;
    if (!matches.length || !location || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) return [];
    return [{
      id: -(index + 1), title: venue.name, address: venue.address ?? '', categories: ['Food'],
      latitude: location.latitude, longitude: location.longitude,
      allDay: true, utcStartDateTime: `${venue.checkedAt}T00:00:00Z`,
      restaurantHref: venue.websiteUrl ?? venue.pinSourceUrl,
      specialLabel: matches.map((special) => [special.title, special.schedule].filter(Boolean).join(' · ')).join(' / '),
      media: venue.photo ? [{ type: '1', originalUrl: venue.photo.src }] : [],
    }];
  });
}
