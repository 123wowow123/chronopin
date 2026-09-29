'use client';

import { useEffect, useRef } from 'react';
import { dayKeyParts } from '@/lib/format';

// The day the home timeline is scrolled to, kept in the URL's hash
// ("/#2026-10-03", "/#-2560-01-01" for 2561 BC) so a reload or a shared link
// opens on that day. The day is the viewer's own, in their time zone, like the
// timeline's day blocks. A bare day key rather than "#day-2026-10-03": the
// blocks carry that id, and a hash naming one would have the browser jump to it
// on load, fighting the timeline's own opening scroll.

// A real day key in the hash, or null.
export function readDayHash(): string | null {
  const match = /^#(-?\d{4,}-\d{2}-\d{2})$/.exec(window.location.hash);
  if (!match) return null;
  const [, month, day] = dayKeyParts(match[1]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31 ? match[1] : null;
}

// Replaced rather than pushed, so scrolling does not fill the history.
function writeDayHash(day: string) {
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${day}`);
}

// Input that means the reader is moving the timeline themselves.
const READER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
// How long the scroll must rest before the hash follows it: one write (and one
// analytics hit) per stop rather than one per day flown past, and well under
// Safari's cap of 100 history writes in 10 seconds.
const SETTLE_MS = 500;

// The day at the top of the window: the last day block ([data-day], in page
// order) whose top has reached the sticky bars' edge, where a jump lands it.
function topDay(): string | null {
  const blocks = document.querySelectorAll<HTMLElement>('[data-day]');
  if (!blocks.length) return null;
  const line = parseFloat(getComputedStyle(blocks[0]).scrollMarginTop || '0') + 8;
  // In page order, so a binary search: a long scroll holds hundreds of days.
  let low = 0;
  let high = blocks.length - 1;
  let found = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (blocks[mid].getBoundingClientRect().top <= line) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return blocks[found].dataset.day || null;
}

// Keeps the hash on the day at the top of the window once the reader has
// started scrolling (the timeline's own opening scroll leaves a plain URL
// alone), and hands each new day to onDay. `ready` says the timeline has
// made its opening scroll; before that the top of the page means nothing.
// A hash typed into the address bar goes to onJump.
export function useDayHash({
  ready,
  onDay,
  onJump,
}: {
  ready: () => boolean;
  onDay: (day: string) => void;
  onJump: (day: string) => void;
}) {
  const latest = useRef({ ready, onDay, onJump });
  useEffect(() => {
    latest.current = { ready, onDay, onJump };
  });

  // Hidden (another route showing) or unmounted, it stops listening: the
  // window's scroll then belongs to that page.
  useEffect(() => {
    let engaged = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const engage = () => {
      engaged = true;
    };
    const settle = () => {
      if (!engaged || !latest.current.ready()) return;
      const day = topDay();
      if (!day || day === readDayHash()) return;
      writeDayHash(day);
      latest.current.onDay(day);
    };
    const onScroll = () => {
      clearTimeout(timer);
      timer = setTimeout(settle, SETTLE_MS);
    };
    const onHashChange = () => {
      const day = readDayHash();
      if (day) latest.current.onJump(day);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('hashchange', onHashChange);
    for (const type of READER_INPUT) window.addEventListener(type, engage, { capture: true, passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('hashchange', onHashChange);
      for (const type of READER_INPUT) window.removeEventListener(type, engage, true);
    };
  }, []);
}
