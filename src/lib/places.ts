// The shape /api/pins/:id/place answers with, and the formatting the panel
// needs. Each source contributes a star rating and a link to its own page for
// that place - the reviews themselves stay where their authors wrote them. Mirrors src/lib/weather.ts: types and pure functions here, the fetch
// shared so several components on a page ask once.

import type { MessageKey, Translator } from './i18n/translate';

export type PlaceScoreJson = {
  source: 'Google' | 'Yelp';
  rating: number;
  ratingMax: number;
  count: number | null;
  url: string | null;
};

export type PlaceBusyJson = {
  live: number | null;
  typical: number | null;
  waitMinutes: number | null;
  trend: 'much-less' | 'less' | 'usual' | 'more' | 'much-more' | null;
};

export type PlaceHoursJson = {
  openNow: boolean | null;
  closing: string | null;
  week: string[];
};

export type PinPlaceJson = {
  scores: PlaceScoreJson[];
  hours: PlaceHoursJson | null;
  busy: PlaceBusyJson | null;
  reservation: { url: string; provider: string | null } | null;
  sources: ('Google' | 'Yelp')[];
};

// What the pin's own JSON carries: the handles, so a page knows whether to
// ask at all. The scores are never in here - they are fetched live.
export type PinPlaceHandlesJson = {
  googlePlaceId?: string | null;
  yelpBusinessId?: string | null;
  reservationUrl?: string | null;
  reservationProvider?: string | null;
};

const TRENDS: Record<NonNullable<PlaceBusyJson['trend']>, MessageKey> = {
  'much-less': 'place.busy.muchLess',
  less: 'place.busy.less',
  usual: 'place.busy.usual',
  more: 'place.busy.more',
  'much-more': 'place.busy.muchMore',
};

// Whether a pin has somewhere to look up. The page asks this before it
// renders the panel at all, so a pin with no place makes no request.
export function hasPlace(place: PinPlaceHandlesJson | null | undefined): boolean {
  return !!(place && (place.googlePlaceId || place.yelpBusinessId || place.reservationUrl));
}

// A rating as its source prints it: Google and Yelp are both out of 5, shown
// to one decimal so 4.0 does not read as 4.
export function ratingOutOf(score: PlaceScoreJson): string {
  return score.rating.toFixed(1);
}

// How full it is, in words, with the number when there is one. Returns null
// when busyness said nothing, which is the common case.
export function busyLabel(busy: PlaceBusyJson | null | undefined, t: Translator): string | null {
  if (!busy) {
    return null;
  }
  if (busy.trend) {
    return t(TRENDS[busy.trend]);
  }
  if (busy.live != null) {
    return t('place.busy.percent', { percent: busy.live });
  }
  return null;
}

// The wait, in words: "about 25 min wait". Null when Google printed none,
// which it does for most places.
export function waitLabel(busy: PlaceBusyJson | null | undefined, t: Translator): string | null {
  return busy?.waitMinutes != null ? t('place.busy.wait', { minutes: busy.waitMinutes }) : null;
}

// How wide the busy bar is: the live reading where there is one, else what
// this hour usually looks like.
export function busyPercent(busy: PlaceBusyJson | null | undefined): number | null {
  const value = busy?.live ?? busy?.typical ?? null;
  return value == null ? null : Math.max(0, Math.min(100, value));
}

// Shares one request between the components on a page, and keeps it for the
// life of the page: the server already caches, and a pin page is not open
// long enough for a rating to move.
const requests = new Map<number, Promise<PinPlaceJson | null>>();

export function loadPlace(pinId: number): Promise<PinPlaceJson | null> {
  let request = requests.get(pinId);
  if (!request) {
    request = fetch(`/api/pins/${pinId}/place`)
      .then((res) => (res.status === 200 ? (res.json() as Promise<PinPlaceJson>) : null))
      .catch(() => {
        requests.delete(pinId);
        return null;
      });
    requests.set(pinId, request);
  }
  return request;
}
