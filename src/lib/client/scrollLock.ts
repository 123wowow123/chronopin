'use client';

import { useEffect } from 'react';

// How many open overlays are holding the page still. More than one only while a
// pick navigates away: the old page stays mounted, hidden, until the new one
// is ready, so both release their hold before the page scrolls again.
let scrollLocks = 0;

// Where the finger was at the last touch event, to tell which way a drag goes.
let lastX = 0;
let lastY = 0;

function touchStart(event: TouchEvent) {
  lastX = event.touches[0]?.clientX ?? 0;
  lastY = event.touches[0]?.clientY ?? 0;
}

// overflow: hidden (globals.css) stops wheels, but a touch drag still reaches
// the page on a phone: straight through anything that does not scroll, and
// chained on from anything that does once it runs out - a flick to the end of
// the nav drawer carried on into the timeline under it. So a drag is let
// through only inside something that scrolls and can still move the way the
// finger is going; the rest is stopped. Sideways drags pass (the page does
// not scroll sideways, and the drawer's swipe and the tab rows need them).
function touchMove(event: TouchEvent) {
  const touch = event.touches[0];
  if (!touch) return;
  const dx = touch.clientX - lastX;
  const dy = touch.clientY - lastY;
  lastX = touch.clientX;
  lastY = touch.clientY;
  if (Math.abs(dx) > Math.abs(dy)) return;
  for (let el = event.target as Element | null; el && el !== document.body; el = el.parentElement) {
    const { overflowY } = getComputedStyle(el);
    if ((overflowY !== 'auto' && overflowY !== 'scroll') || el.scrollHeight <= el.clientHeight) continue;
    // The finger going down scrolls toward the top.
    const canMove = dy > 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1;
    if (canMove) return;
    break;
  }
  if (event.cancelable) event.preventDefault();
}

// Holds the page still behind an open overlay (globals.css reads the attribute,
// below xl only, and so does the touch guard above).
export function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    scrollLocks += 1;
    document.documentElement.dataset.scrollLock = '';
    const touch = window.matchMedia('(width < 80rem)').matches;
    if (touch) {
      document.addEventListener('touchstart', touchStart, { passive: true });
      document.addEventListener('touchmove', touchMove, { passive: false });
    }
    return () => {
      scrollLocks -= 1;
      if (!scrollLocks) delete document.documentElement.dataset.scrollLock;
      // Adding the same listener twice is a no-op, so removing it once is
      // enough; only when the last lock lets go.
      if (!scrollLocks) {
        document.removeEventListener('touchstart', touchStart);
        document.removeEventListener('touchmove', touchMove);
      }
    };
  }, [locked]);
}
