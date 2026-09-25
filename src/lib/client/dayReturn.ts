'use client';

import { splitLocale } from '@/lib/i18n/config';
import { type CardSpot, keepSpot, timelineSpotHere } from '@/lib/client/returnSpot';

// "View all" under a crowded day opens the whole day as a date: search, and
// that page offers the way back to the spot on the timeline it was opened
// from. The trip is marked as the link is clicked (leaveTimelineForDay) and
// read by the search page's back pill (dayTrip, backToTimeline).
//
// The way back is history: the router keeps the timeline mounted but hidden
// while the search shows, and puts its scroll back as it shows again
// (useManualScrollRestoration), so going back lands exactly where the reader
// was. After a reload there is no kept timeline to go back to, only a fresh
// one opening on today; then the pill opens it on the card that was at the
// top of the window instead (?pin=, with the saved spot), as coming back from
// logging in does.
//
// sessionStorage rather than module state alone, so a reload of the search
// still knows it came from the timeline. Storage can be refused (a private
// window); then there is no mark and no pill, and the browser's own back
// button still works.

const KEY = 'dayReturn:trip';

type Trip = { q: string; href: string; spot: CardSpot | null };

// The day search this page load itself went to from the timeline: history
// holds the timeline right behind it. Gone with a reload.
let liveTrip: string | null = null;

function write(value: Trip | null) {
  try {
    if (value) sessionStorage.setItem(KEY, JSON.stringify(value));
    else sessionStorage.removeItem(KEY);
  } catch {
    // No mark, then.
  }
}

// "View all" is being followed to `searchHref`, from the timeline.
export function leaveTimelineForDay(searchHref: string) {
  const q = new URL(searchHref, location.origin).searchParams.get('q') ?? '';
  const { spot, href } = timelineSpotHere();
  write({ q, href, spot });
  liveTrip = q;
}

// The trip, while the reader is still on the day search it opened; null on
// any other page or search.
export function dayTrip(): Trip | null {
  let trip: Trip | null = null;
  try {
    trip = JSON.parse(sessionStorage.getItem(KEY) || 'null');
  } catch {
    trip = null;
  }
  if (!trip || splitLocale(location.pathname).path !== '/search') return null;
  return new URLSearchParams(location.search).get('q') === trip.q ? trip : null;
}

// Called as the timeline shows: the trip is over.
export function settleDayTrip() {
  write(null);
  liveTrip = null;
}

// Back to the spot the trip left. `back` and `push` are the router's.
export function backToTimeline(router: { back: () => void; push: (href: string) => void }) {
  const trip = dayTrip();
  if (trip && liveTrip === trip.q) {
    router.back();
    return;
  }
  if (trip?.spot) keepSpot(trip.spot, trip.href);
  router.push(trip?.href ?? '/');
}
