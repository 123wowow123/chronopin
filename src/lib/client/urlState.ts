'use client';

import { usePathname, useSearchParams } from '@/lib/client/navigation';
import { useEffect, useState } from 'react';
import { splitLocale } from '@/lib/i18n/config';

// Mirrors view state into the URL's query string (null removes a key) so a
// reload or shared link reopens the same view. Replaced rather than pushed, so
// dragging a slider does not fill the history. It re-applies when the URL
// changes under a page that stays mounted (a new search on the map).
export function useQueryState(values: Record<string, string | null>) {
  const pathname = usePathname();
  const [ownPath] = useState(pathname);
  const search = useSearchParams().toString();
  const key = JSON.stringify(values);

  useEffect(() => {
    // A page being left must not write onto the next page's URL.
    if (splitLocale(window.location.pathname).path !== ownPath) return;
    const params = new URLSearchParams(window.location.search);
    for (const [name, value] of Object.entries(JSON.parse(key) as Record<string, string | null>)) {
      if (value === null) params.delete(name);
      else params.set(name, value);
    }
    const next = params.size ? `?${params.toString()}` : '';
    // The hash stays: the timeline keeps the day it is scrolled to there.
    if (next !== window.location.search) window.history.replaceState(null, '', `${window.location.pathname}${next}${window.location.hash}`);
  }, [key, search, ownPath]);
}
