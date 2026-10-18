import type { RestaurantMenuProfile } from '@/lib/restaurantMenus';
import { isRestaurantPromotion } from '@/lib/restaurantOffers';
import { pinPath } from '@/lib/seo';
import type { MapPinJson } from '@/lib/types';
import Pin from '@/server/model/pin';
import { listSpecialVenues } from '@/server/model/restaurantSpecialVenue';

type Venue = RestaurantMenuProfile & { address?: string; websiteUrl?: string };

// Resolve only known curated offers. Never accept marker coordinates or links
// from the URL. This also covers venues not yet stored as database pins.
export async function restaurantSpecialMap(ids: string[]): Promise<MapPinJson[]> {
  if (!ids.length) return [];
  const records = await listSpecialVenues();
  const profiles = records.map((record) => record.profile);
  const pinsBySource = await Pin.findBySourceUrls(profiles.map((p) => p.pinSourceUrl).filter(Boolean));
  return buildRestaurantSpecialMap(ids, profiles, pinsBySource);
}

export function buildRestaurantSpecialMap(ids: string[], profiles: Venue[], pinsBySource?: Map<string, { id: number; title: string }>): MapPinJson[] {
  const requested = new Set(ids);
  const venues = new Map<string, Venue>();
  for (const venue of profiles) venues.set(venue.pinSourceUrl, venue);
  return [...venues.values()].flatMap((venue, index) => {
    const matches = venue.specials.filter((special, specialIndex) => isRestaurantPromotion(special) && requested.has(`${venue.pinSourceUrl}#${specialIndex}`));
    const location = venue.location;
    if (!matches.length || !location || !Number.isFinite(location.latitude) || Math.abs(location.latitude) > 90 || !Number.isFinite(location.longitude) || Math.abs(location.longitude) > 180) return [];
    const pin = pinsBySource?.get(venue.pinSourceUrl);
    if (pinsBySource && !pin) return [];
    return [{
      id: -(index + 1), title: venue.name, address: venue.address ?? '', categories: ['Food'],
      latitude: location.latitude, longitude: location.longitude,
      allDay: true, utcStartDateTime: `${venue.checkedAt}T00:00:00Z`,
      restaurantHref: pin ? pinPath(pin) : (venue.websiteUrl ?? venue.pinSourceUrl),
      specialLabel: matches.map((special) => [special.title, special.schedule].filter(Boolean).join(' · ')).join(' / '),
      media: venue.photo ? [{ type: '1', originalUrl: venue.photo.src }] : [],
    }];
  });
}
