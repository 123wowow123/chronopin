// Cache tags for server-rendered pages. Route handlers that change pins call
// these so the next visitor (and crawler) sees the change.

import { revalidateTag } from 'next/cache';

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
