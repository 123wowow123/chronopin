import { AD_SLOTS, MIN_AD_AGE } from './ads';

// The site's AdSense publisher id: the one in the page's meta tag, the script
// in the root layout and public/ads.txt.
export const ADSENSE_CLIENT = 'ca-pub-4845333369058390';

// Placements that carry Google ads: the Amazon slots, and the banner across the
// bottom of a pin page, which has no Amazon ads to fall back to.
export const ADSENSE_PLACEMENTS = [...AD_SLOTS, 'pin-bottom'] as const;
export type AdsensePlacement = (typeof ADSENSE_PLACEMENTS)[number];

// The AdSense ad unit shown in a placement instead of its Amazon ads, by
// placement. An admin setting (AppSetting "adsenseSlots"): a placement with no
// unit keeps its Amazon ads, so nothing shows blank before AdSense has approved
// the site and made the unit.
export type AdsenseSlotsSetting = Partial<Record<AdsensePlacement, string>>;

export const DEFAULT_ADSENSE_SLOTS: AdsenseSlotsSetting = {};

// An ad unit's id, the digits AdSense shows as data-ad-slot.
const UNIT_ID = /^\d{6,20}$/;

// A stored or submitted value as a setting, or the problem with it. A slot
// left out or "" has no unit.
export function parseAdsenseSlots(value: unknown): { setting: AdsenseSlotsSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { problem: `Expected { ${ADSENSE_PLACEMENTS.join(', ')} } with an ad unit id for each` };
  }
  const given = value as Record<string, unknown>;
  const setting: AdsenseSlotsSetting = {};
  for (const slot of ADSENSE_PLACEMENTS) {
    const id = given[slot];
    if (id === undefined || id === '') continue;
    if (typeof id !== 'string' || !UNIT_ID.test(id.trim())) {
      return { problem: `${slot} must be an ad unit id: 6 to 20 digits` };
    }
    setting[slot] = id.trim();
  }
  return { setting };
}

// Whether Google ads may be shown to a viewer of this age (null: not signed in
// or no birthday). Children under the ad age get none, as with the Amazon ads.
export function adsenseAllowed(age: number | null): boolean {
  return age == null || age >= MIN_AD_AGE;
}
