'use client';

import { useLayoutEffect, useRef } from 'react';

// For pages that open on today and scroll there themselves.
//
// Reload: left to the browser, a reload puts back the old scroll position a
// moment later (once the page has loaded), undoing the jump to today.
//
// Back/forward: Next.js keeps the page mounted but hidden (Activity) while
// another route shows, which keeps its state but not the window's scroll
// position. It is saved as the page hides and put back as it shows again -
// before the infinite-scroll sentinels start observing, which would otherwise
// see the top of the page and load pages above.
//
// Other pages keep the browser's behaviour.
//
// Call it after the component's own open-on-today layout effect: effects run
// in order, so the position recorded on mount (and put back by a development
// Strict Mode remount) is today's rather than the top of the page.
export function useManualScrollRestoration() {
  const savedScrollY = useRef<number | null>(null);

  useLayoutEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (savedScrollY.current !== null) window.scrollTo({ top: savedScrollY.current });

    // The position as of the last scroll event, not window.scrollY at hide
    // time: the next route's page is inserted above this one in the same
    // commit that hides it, and the browser's scroll anchoring has already
    // shifted scrollY by that page's height when the cleanup runs.
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      lastScrollY = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', onScroll);
      savedScrollY.current = lastScrollY;
      // Back to the browser default, not the value found on mount: the browser
      // keeps an entry's mode across reloads, so that could be our own 'manual'.
      if ('scrollRestoration' in history) history.scrollRestoration = 'auto';
    };
  }, []);
}
