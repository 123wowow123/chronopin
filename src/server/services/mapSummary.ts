// The pins the map page lists in its server-rendered HTML. The map itself is
// drawn in the browser, so without this the page's HTML is empty and Google
// reports it as a soft 404.

import { cacheLife, cacheTag } from 'next/cache';
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n/config';
import { toJson, type MapPinJson } from '@/lib/types';
import { mapPins } from './mapPins';
import { TAGS } from './cache';
import { localizePins } from './translations';

const LISTED = 24;
const WINDOW_DAYS = 90;

// The next pins to start that have a place on the map, soonest first.
export async function upcomingMapPins(locale: Locale = DEFAULT_LOCALE): Promise<MapPinJson[]> {
  'use cache';
  cacheLife('hours');
  cacheTag(TAGS.timeline);
  const now = new Date();
  const pins = toJson<MapPinJson[]>(await mapPins({
    from: now,
    to: new Date(now.getTime() + WINDOW_DAYS * 86_400_000),
    createdSince: null,
    q: '',
    onlyWatched: false,
    userId: null,
    timeZone: 'UTC',
  }));
  const soonest = pins
    .filter((pin) => pin.address && pin.utcStartDateTime)
    .sort((a, b) => a.utcStartDateTime!.localeCompare(b.utcStartDateTime!))
    .slice(0, LISTED);
  return localizePins(soonest, locale);
}
