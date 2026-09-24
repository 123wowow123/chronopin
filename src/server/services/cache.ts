// Cache tags for server-rendered pages. Route handlers that change pins call
// these so the next visitor (and crawler) sees the change.

import { revalidateTag } from 'next/cache';
import { DEFAULT_MULTILINGUAL, type OtherLocale } from '@/lib/multilingual';
import { getMultilingual } from '../model/appSetting';

export const TAGS = {
  timeline: 'timeline',
  sitemap: 'sitemap',
  pin: (id: number | string) => `pin:${id}`,
};

// The pin id -> canonical path cache src/proxy.ts keeps. It lives on
// globalThis so the proxy and route handlers share one copy in the process.
export function pinPathCache(): Map<number, { path: string | null; expires: number }> {
  const g = globalThis as unknown as { __chronopinPinPaths?: Map<number, { path: string | null; expires: number }> };
  return (g.__chronopinPinPaths ??= new Map());
}

// Which of the site's other languages are offered (src/lib/multilingual.ts).
// src/proxy.ts asks on every page request, so the answer is kept for a while
// on globalThis, shared with the route handler that changes it (which sets it
// at once). Unreadable - the database down, or a build with none - it is the
// last answer, else the default.
const MULTILINGUAL_TTL_MS = 30_000;

type MultilingualCache = { locales: OtherLocale[]; expires: number };

function multilingualCache(): MultilingualCache {
  const g = globalThis as unknown as { __chronopinMultilingual?: MultilingualCache };
  return (g.__chronopinMultilingual ??= { locales: DEFAULT_MULTILINGUAL.locales, expires: 0 });
}

export async function offeredLocales(): Promise<OtherLocale[]> {
  const cache = multilingualCache();
  if (cache.expires <= Date.now()) {
    cache.locales = await getMultilingual().then((s) => s.locales, () => cache.locales);
    cache.expires = Date.now() + MULTILINGUAL_TTL_MS;
  }
  return cache.locales;
}

// After the admin setting changes: the proxy follows at once, and the cached
// pages and sitemap drop (or gain) languages.
export function setOfferedLocales(locales: OtherLocale[]) {
  Object.assign(multilingualCache(), { locales, expires: Date.now() + MULTILINGUAL_TTL_MS });
  revalidateTag(TAGS.timeline, { expire: 0 });
  revalidateTag(TAGS.sitemap, { expire: 0 });
}

// The pin's own page expires at once, so its author sees the edit they just
// made (and the new slug agrees with the proxy's). Lists of pins can be a
// moment stale.
export function invalidatePin(id: number | string) {
  pinPathCache().delete(Number(id));
  revalidateTag(TAGS.pin(id), { expire: 0 });
  revalidateTag(TAGS.timeline, 'max');
  revalidateTag(TAGS.sitemap, 'max');
}

// Only the pin's own page changed (a comment's score, say): the timeline and
// sitemap do not show it.
export function expirePinPage(id: number | string) {
  revalidateTag(TAGS.pin(id), 'max');
}

export function invalidateTimeline() {
  revalidateTag(TAGS.timeline, 'max');
}

// A setting that changes which pins every timeline page holds: expire at once,
// so the admin sees the effect on their next load rather than after a stale one.
export function expireTimeline() {
  revalidateTag(TAGS.timeline, { expire: 0 });
}
