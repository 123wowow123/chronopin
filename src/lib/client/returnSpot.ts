'use client';

import { authHref, type AuthPage } from '@/lib/authRedirect';
import { DEFAULT_LOCALE, localizePath, splitLocale } from '@/lib/i18n/config';

// Where the reader was when they went to log in, sign up or log out, so
// finishing comes back there: the card at the top of the timeline or of a
// search's results, or the map's view.
//
// Each of those is a full reload, which opens the timeline and a search's dates on
// today, a search by relevance on its best match and the map on its default
// view. The URL already brings back the page and its filters; the spot waits
// here to put back the rest.
//
// On the timeline the card may be pages away from today, so the redirect opens
// the timeline on it (?pin=, which loads the pages around it), and its distance
// from the top of the window puts it back exactly where it was, rather than
// centred and outlined like a pin page's "To timeline". A search has no such
// entry point, so its results page toward the card instead.

const KEY = 'returnSpot';
// Long enough to fill in the sign-up form; a spot older than that is not
// coming back.
const MAX_AGE_MS = 15 * 60_000;

export type CardSpot = { kind: 'card'; pinId: number; top: number; start?: string };
export type MapSpot = { kind: 'map'; lat: number; lng: number; zoom: number };
// href: the page to come back to, which a spot is only for.
type Saved = (CardSpot | MapSpot) & { href: string; savedAt: number };

// Where the reader is in the app, without the language prefix ("/es/map" ->
// "/map"): the spots and the hrefs below are app paths, which the links and
// router put back into the page's language.
function appPathname(): string {
  return splitLocale(window.location.pathname).path;
}

// The map's current view, while a map is showing.
let mapView: (() => Omit<MapSpot, 'kind'>) | null = null;

export function setMapViewSource(source: typeof mapView) {
  mapView = source;
  return () => {
    if (mapView === source) mapView = null;
  };
}

// The Log in or Sign up link for the page the reader is on right now, keeping
// its query (a search, the filters) and saving the spot on it.
export function authHrefHere(page: AuthPage = '/login'): string {
  return authHref(page, saveSpotHere());
}

// The Log out link for the page the reader is on right now, the same way.
// Logging out is a route handler outside the languages, so the page to come
// back to goes in its own language.
export function logoutHrefHere(): string {
  const locale = splitLocale(window.location.pathname).locale ?? DEFAULT_LOCALE;
  return `/logout?referrer=${encodeURIComponent(localizePath(saveSpotHere(), locale))}`;
}

// Saves the spot on this page, and answers the page to come back to.
function saveSpotHere(): string {
  const { search } = window.location;
  const pathname = appPathname();
  let href = pathname + search;
  let spot: CardSpot | MapSpot | null = null;
  if (pathname === '/' || pathname === '/search') {
    spot = cardAtTop();
    if (spot && pathname === '/') {
      const params = new URLSearchParams(search);
      // The pin decides the pages loaded; a page cursor would only disagree.
      params.delete('from_date_time');
      params.delete('last_pin_id');
      params.set('pin', String(spot.pinId));
      href = `/?${params}`;
    }
  } else if (pathname === '/map' && mapView) {
    spot = { kind: 'map', ...mapView() };
  }
  if (spot) save(spot, href);
  return href;
}

// Where taking a filter off goes (href: the timeline, or a search for what is
// left), opening on the date the reader was at rather than today. Only from a
// page of cards by date: a search by relevance has no date to keep.
//
// Taking a filter off only ever widens the results, so the card at the top of
// the window is among them: the timeline opens on it (?pin=) and a search's
// dates page toward it, and it goes back as far down the window as it was.
// It keeps the way the search was shown (sort, date windows; on the timeline
// the posting window).
export function hrefKeepingDate(href: string): string {
  const next = new URL(href, location.origin);
  const here = appPathname();
  if ((here !== '/' && here !== '/search') || (next.pathname !== '/' && next.pathname !== '/search')) return href;
  if (here === '/search') {
    const current = new URLSearchParams(window.location.search);
    // The timeline has a posting window too, and widens it itself for its pin.
    for (const key of next.pathname === '/search' ? VIEW_PARAMS : ['posted']) {
      const value = current.get(key);
      if (value !== null && !next.searchParams.has(key)) next.searchParams.set(key, value);
    }
  }
  const spot = cardAtTop(DATE_CARDS);
  if (spot) {
    if (next.pathname === '/') {
      next.searchParams.delete('from_date_time');
      next.searchParams.delete('last_pin_id');
      next.searchParams.set('pin', String(spot.pinId));
    }
    save(spot, next.pathname + next.search);
  }
  return next.pathname + next.search;
}

// How a search is shown, as opposed to what it searches for.
const VIEW_PARAMS = ['sort', 'posted', 'past', 'future'];

function save(spot: CardSpot | MapSpot, href: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...spot, href, savedAt: Date.now() } satisfies Saved));
  } catch {
    // Without storage the page opens as it would anyway.
  }
}

// The timeline opening on this pin's saved distance from the top of the
// window, once: it is removed as it is read. Matched by the pin rather than
// the whole URL, as signing in can change the posting window in it.
export function takeTimelineSpot(pinId: number): number | null {
  const spot = take();
  return spot?.kind === 'card' && spot.pinId === pinId && new URL(spot.href, location.origin).pathname === '/' ? spot.top : null;
}

// The card this search page was left on, once.
export function takeSearchSpot(): CardSpot | null {
  const spot = take();
  return spot?.kind === 'card' && isHere(spot.href) ? spot : null;
}

// The view this map was left on. Read without removing it, then cleared once
// the map has taken it: a development Strict Mode remount builds the map twice.
export function peekMapSpot(): MapSpot | null {
  const spot = read();
  return spot?.kind === 'map' && isHere(spot.href) ? spot : null;
}

export function clearSpot() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

function read(): Saved | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const spot = raw ? (JSON.parse(raw) as Saved) : null;
    return spot && Date.now() - spot.savedAt < MAX_AGE_MS ? spot : null;
  } catch {
    return null;
  }
}

function take(): Saved | null {
  const spot = read();
  clearSpot();
  return spot;
}

// The same page and query, in any order.
function isHere(href: string) {
  const saved = new URL(href, location.origin);
  const sort = (params: URLSearchParams) => [...params].map(([k, v]) => `${k}=${v}`).sort().join('&');
  return saved.pathname === appPathname() && sort(saved.searchParams) === sort(new URLSearchParams(location.search));
}

// Cards on a page by date (the timeline, a search's dates); by relevance they
// are li#rank-.
const DATE_CARDS = '[role="listitem"][id^="pin-"]';

// The highest card still showing below the sticky bars. Cards sit in columns,
// so the first in the page is not always the highest on screen; a hidden
// list's cards have no height.
function cardAtTop(cards = `${DATE_CARDS}, li[id^="rank-"]`): CardSpot | null {
  const bars = [...document.querySelectorAll('header, [data-sticky-sort]')].map((el) => el.getBoundingClientRect().bottom);
  const covered = Math.max(0, ...bars);
  let best: CardSpot | null = null;
  for (const el of document.querySelectorAll<HTMLElement>(cards)) {
    const rect = el.getBoundingClientRect();
    const pinId = Number(el.id.slice(el.id.indexOf('-') + 1));
    if (!rect.height || rect.bottom <= covered || rect.top >= window.innerHeight || !Number.isInteger(pinId)) continue;
    if (!best || rect.top < best.top) best = { kind: 'card', pinId, top: rect.top, start: el.dataset.start };
  }
  return best;
}
