'use client';

import { useEffect } from 'react';

// How many open overlays are holding the page still. More than one only while a
// pick navigates away: the old page stays mounted, hidden, until the new one
// is ready, so both release their hold before the page scrolls again.
let scrollLocks = 0;

// Holds the page still behind an open overlay (globals.css reads the attribute,
// below xl only).
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    scrollLocks += 1;
    document.documentElement.dataset.scrollLock = '';
    return () => {
      scrollLocks -= 1;
      if (!scrollLocks) delete document.documentElement.dataset.scrollLock;
    };
  }, [locked]);
}
