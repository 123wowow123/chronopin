'use client';

import { splitLocale } from '@/lib/i18n/config';

// Below lg the account's pages - the profile, notifications, the admin
// dashboard - are reached from the nav drawer, and each is somewhere a reader
// goes to look at or change one thing and come straight back: to the menu
// they left it from, open over the page it was open over. The drawer marks the
// trip out (leaveDrawer), a page's back arrow reads the mark (backFromDrawer)
// and asks for the drawer again (returnToDrawer), which the drawer takes up
// once the page it opened from is showing (takeDrawerReturn).
//
// Everything is read and written in handlers and animation frames, never in
// an effect's own body: in development React runs effects twice, and a mark
// taken off by the first run would be gone for the second.
//
// sessionStorage rather than module state, so a reload on the way still knows
// where it came from. Storage can be refused (a private window); then there is
// no mark, and the arrow goes home instead.

const TRIP = 'drawer:trip';
const REOPEN = 'drawer:reopen';

// The pages the drawer sends a reader to that have the arrow back to it. Off
// all of them, no trip from the drawer is under way.
const DRAWER_PAGES = ['/profile', '/notifications', '/admin'];

type Trip = { from: string; to: string };

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Nothing to come back to, then.
  }
}

// Where the reader is, in the site's own paths (no language prefix), which is
// what the router is handed and what the drawer compares.
function here() {
  return `${splitLocale(location.pathname).path}${location.search}`;
}

// The drawer is being left for `to`, one of its own pages.
export function leaveDrawer(to: string) {
  write(TRIP, JSON.stringify({ from: here(), to } satisfies Trip));
}

// Where the arrow goes: straight back through history while the reader is
// still on the page the drawer opened (so the page behind comes back where it
// was scrolled to), or to the page it was opened over once they have moved on
// within the section (an admin tab). Home, reached any other way. The mark is
// taken off.
export function backFromDrawer(): { back: true } | { back: false; href: string } {
  let trip: Trip | null = null;
  try {
    trip = JSON.parse(read(TRIP) || 'null');
  } catch {
    trip = null;
  }
  write(TRIP, null);
  if (!trip) return { back: false, href: '/' };
  return splitLocale(location.pathname).path === trip.to ? { back: true } : { back: false, href: trip.from };
}

// Called as each page shows: off the drawer's pages the trip is over.
export function settleDrawerMark(pathname: string) {
  if (!DRAWER_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))) write(TRIP, null);
}

// The way back is to open the drawer again once the page before is showing.
export function returnToDrawer() {
  write(REOPEN, '1');
}

// Whether the drawer should open itself on the page now showing.
export function takeDrawerReturn(): boolean {
  const reopen = read(REOPEN) === '1';
  if (reopen) write(REOPEN, null);
  return reopen;
}
