'use client';

import { authHref, type AuthPage } from '@/lib/authRedirect';

// Where on the timeline the reader was when they went to log in or sign up, so
// finishing comes back there instead of to today.
//
// Either is a full reload, which opens the timeline on today, and the card
// they were looking at may be pages away from it. So the redirect opens
// the timeline on that card (?pin=, which loads the pages around it), and the
// card's distance from the top of the window waits here to put it back exactly
// where it was, rather than centred and outlined like a pin page's "To
// timeline".

const KEY = 'timelineSpot';
// Long enough to fill in the sign-up form; a spot older than that is not
// coming back.
const MAX_AGE_MS = 15 * 60_000;

type Spot = { pinId: number; top: number; savedAt: number };

// The Log in or Sign up link for the page the reader is on right now, keeping
// its query (a search, the posting window) and, on the timeline, the card at
// the top of the window.
export function authHrefHere(page: AuthPage = '/login'): string {
  const { pathname, search } = window.location;
  const card = pathname === '/' ? cardAtTop() : null;
  if (!card) return authHref(page, pathname + search);
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...card, savedAt: Date.now() } satisfies Spot));
  } catch {
    // Without storage the card still comes back, centred instead.
  }
  const params = new URLSearchParams(search);
  // The pin decides the pages loaded; a page cursor would only disagree.
  params.delete('from_date_time');
  params.delete('last_pin_id');
  params.set('pin', String(card.pinId));
  return authHref(page, `/?${params}`);
}

// The saved distance from the top of the window for the timeline opening on
// this pin, once: it is removed as it is read.
export function takeTimelineSpot(pinId: number): number | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const spot = JSON.parse(raw) as Spot;
    return spot.pinId === pinId && Date.now() - spot.savedAt < MAX_AGE_MS && Number.isFinite(spot.top) ? spot.top : null;
  } catch {
    return null;
  }
}

// The highest card still showing below the sticky navbar. Cards sit in
// columns, so the first in the page is not always the highest on screen.
function cardAtTop(): Omit<Spot, 'savedAt'> | null {
  const covered = Math.max(0, document.querySelector('header')?.getBoundingClientRect().bottom ?? 0);
  let best: Omit<Spot, 'savedAt'> | null = null;
  for (const el of document.querySelectorAll<HTMLElement>('[role="listitem"][id^="pin-"]')) {
    const rect = el.getBoundingClientRect();
    const pinId = Number(el.id.slice('pin-'.length));
    if (!rect.height || rect.bottom <= covered || rect.top >= window.innerHeight || !Number.isInteger(pinId)) continue;
    if (!best || rect.top < best.top) best = { pinId, top: rect.top };
  }
  return best;
}
