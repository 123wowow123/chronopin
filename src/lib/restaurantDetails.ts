import profiles from '@/server/data/restaurantDetails.json';
import { restaurantSourceKey } from './restaurantMenus';

export type RestaurantDetails = {
  pinSourceUrl: string;
  name: string;
  websiteUrl: string | null;
  phone: string | null;
  openingHours: { days: string; hours: string }[];
  hoursNote?: string;
  detailsSourceUrl?: string;
  additionalSources?: { label: string; url: string }[];
  reservationUrl?: string;
  checkedAt: string;
};

// Retain anchors and paths so a brand's other locations never share details.
export function restaurantDetailsFor(sourceUrl: string | null | undefined): RestaurantDetails | undefined {
  if (!sourceUrl) return undefined;
  return (profiles as RestaurantDetails[]).find((profile) => restaurantSourceKey(profile.pinSourceUrl) === restaurantSourceKey(sourceUrl));
}

export function restaurantPhoneHref(phone: string): string {
  return `tel:${phone.replace(/[^+\d]/g, '')}`;
}

export function restaurantOpenTableUrl(sourceUrl: string | null | undefined, placeReservationUrl?: string | null): string | null {
  for (const value of [placeReservationUrl, restaurantDetailsFor(sourceUrl)?.reservationUrl]) {
    if (!value) continue;
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' && ['opentable.com', 'www.opentable.com', 'opentable.ca', 'www.opentable.ca'].includes(url.hostname)) return value;
    } catch {}
  }
  return null;
}
