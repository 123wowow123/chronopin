// The vocabulary of "within" radii: the rings around the viewer on offer, the
// words they are shown as, and what a person may type for one. Shared by the
// timeline's distance slider, the URL it writes and the server that reads it.
//
// A radius is compared and queried in kilometres, and written in the unit its
// reader uses wherever a person sees it - the URL included. A link therefore
// says the ring somebody actually set ("within=30mi") rather than the
// kilometres it happened to convert to, and reopens on that same ring.

import { KM_PER_MILE, formatDistance } from './distance';
import { FORMAT_WORDS } from './i18n/formatWords';
import type { Locale } from './i18n/config';

// The rings the slider steps through, in the reader's own unit: round numbers
// in miles are not round in kilometres, so each unit has a ladder of its own
// rather than one converted into the other.
const STEPS_KM = [10, 25, 50, 100, 250, 500, 1000, 2500];
const STEPS_MI = [5, 10, 25, 50, 100, 250, 500, 1000, 1500];

// Half the way round the world: past this a ring holds every pin there is, so
// there is no reason to accept more.
export const MAX_RADIUS_KM = 20100;

// The steps on offer, in kilometres, smallest first.
export function radiusSteps(imperial: boolean): number[] {
  return imperial ? STEPS_MI.map((miles) => miles * KM_PER_MILE) : STEPS_KM;
}

// A radius as the slider labels it - "50 km", "30 mi", in the reader's own
// unit and language (formatDistance says it, since it is the same distance the
// cards measure); null, no ring at all, reads as "All".
export const radiusLabel = (km: number | null | undefined, imperial: boolean, locale: Locale = 'en') =>
  km ? formatDistance(km, imperial, locale) : FORMAT_WORDS[locale].all;

// "30 mi", "50km", "50" (the reader's own unit) to kilometres, or null for
// anything this cannot make sense of.
export function parseRadius(text: string, imperial: boolean): number | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*(km|kilometers?|kilometres?|mi|miles?)?\s*$/i.exec(text || '');
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!(value > 0)) return null;
  const unit = (match[2] || '').toLowerCase();
  const inMiles = unit ? unit.startsWith('mi') : imperial;
  const km = inMiles ? value * KM_PER_MILE : value;
  return km <= MAX_RADIUS_KM ? km : null;
}

// The radius as a URL parameter, in the unit it was set in: "30mi", "50km".
// Absent (null) means no ring, which is the default everywhere.
export function radiusToParam(km: number | null, imperial: boolean): string | null {
  if (!km) return null;
  const value = imperial ? km / KM_PER_MILE : km;
  return `${Math.round(value * 100) / 100}${imperial ? 'mi' : 'km'}`;
}

// A URL parameter back to kilometres. A bare number is read in the reader's
// own unit, so a link they wrote by hand means what they meant.
export const radiusFromParam = (value: string | null | undefined, imperial: boolean): number | null =>
  value ? parseRadius(value, imperial) : null;

// How far apart two radii are on a log scale, for putting a typed radius on
// the nearest step of the slider.
export function nearestRadiusIndex(km: number | null, steps: number[]): number {
  if (!km) return steps.length;
  let best = 0;
  let bestDistance = Infinity;
  steps.forEach((step, index) => {
    const distance = Math.abs(Math.log(step) - Math.log(km));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return best;
}
