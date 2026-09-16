'use client';

import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

// Input that means the reader has taken the scroll over.
const TAKEOVER = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
// Long enough for a slow connection's pictures and embeds. A hold that
// outlasts the page settling costs nothing: nothing resizes, nothing moves.
const HOLD_MS = 15_000;

// Scrolls to today and keeps it there while the page settles, for the
// timeline's opening scroll and its Today button alike.
//
// The first scroll runs as soon as the cards are on screen, and the cards above
// today keep growing after it: details that only render in the browser, embeds,
// pictures, the viewer's own time zone. Nothing puts today back - Safari has no
// scroll anchoring, and Chrome's did not catch it - so a reload opened today
// lower than the Today button put it. While held, every change in the page's
// size scrolls to today again. The reader's first wheel, touch, key or press
// lets go, as does a scroll far from today (a dragged scrollbar sends none of
// those) or the time running out.
export function useTodayHold(scrollToToday: () => void) {
  const scroll = useRef(scrollToToday);
  useLayoutEffect(() => {
    scroll.current = scrollToToday;
  });
  // When the hold runs out; 0 once let go.
  const until = useRef(0);
  const detach = useRef<(() => void) | null>(null);

  const attach = useCallback(() => {
    if (detach.current) return;
    let heldY = window.scrollY;
    const stop = () => {
      until.current = 0;
      off();
    };
    const observer = new ResizeObserver(() => {
      if (Date.now() >= until.current) return stop();
      scroll.current();
      heldY = window.scrollY;
    });
    const onScroll = () => {
      if (Math.abs(window.scrollY - heldY) > window.innerHeight) stop();
    };
    const timer = setTimeout(stop, until.current - Date.now());
    const off = () => {
      clearTimeout(timer);
      observer.disconnect();
      window.removeEventListener('scroll', onScroll);
      for (const type of TAKEOVER) window.removeEventListener(type, stop, true);
      detach.current = null;
    };
    observer.observe(document.body);
    window.addEventListener('scroll', onScroll, { passive: true });
    for (const type of TAKEOVER) window.addEventListener(type, stop, { capture: true, passive: true });
    detach.current = off;
  }, []);

  // Hidden (another route showing) or unmounted, the page stops listening; a
  // development Strict Mode remount picks a hold that has not run out back up.
  useEffect(() => {
    if (until.current > Date.now()) attach();
    return () => detach.current?.();
  }, [attach]);

  return useCallback(() => {
    scroll.current();
    until.current = Date.now() + HOLD_MS;
    attach();
  }, [attach]);
}
