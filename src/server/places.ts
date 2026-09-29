// What a pin's place looks like right now: its Google and Yelp scores, a few
// review excerpts, whether it is open, how busy it is, and where to book.
//
// NOTHING HERE IS STORED. Google's and Yelp's terms both limit how long their
// ratings and review text may be kept, and a score that sat in the database
// for a week would be wrong anyway - a restaurant's rating moves. So this
// module is shaped like src/server/weather.ts: an in-process cache with a
// short TTL, shared by everyone looking at the same pin, holding the answer
// only long enough to serve a burst of views. The database keeps the
// identifiers (PinPlace, 0059) and nothing else.
//
// Every source is optional and independent. No Google key -> no Google half.
// No Yelp key -> no Yelp half. Busyness unreachable -> no busy bar. A pin
// with one of the three still renders the panel with that one.
//
// Busyness is the exception to the caching above: it is read from its own
// cache without being waited for (see googleBusyness.busynessNow), because a
// cold read of it costs a Chromium launch and must not hold up a rating.

import config from './config';
import { busynessNow, type PlaceBusy } from './googleBusyness';
import { openFromHours } from './placeScrape';
import log from './util/log';

export type { PlaceBusy };

export type PlaceScore = {
  source: 'Google' | 'Yelp';
  rating: number;
  ratingMax: number;
  // How many people rated it, which is most of what a 4.5 means.
  count: number | null;
  url: string | null;
};

export type PlaceHours = {
  openNow: boolean | null;
  // "Closes 10:45 PM" - already worded by the source in its own locale.
  closing: string | null;
  // The week, one line a day, for the panel's expandable list.
  week: string[];
};

export type PinPlaceInfo = {
  scores: PlaceScore[];
  hours: PlaceHours | null;
  busy: PlaceBusy | null;
  reservation: { url: string; provider: string | null } | null;
  // Which sources answered. Not rendered - the panel names each source on its
  // own chip - but it is what tells you, from the response alone, whether a
  // missing score was an outage or a place nobody has rated.
  sources: ('Google' | 'Yelp')[];
};

export type PlaceHandles = {
  googlePlaceId?: string | null;
  yelpBusinessId?: string | null;
  reservationUrl?: string | null;
  reservationProvider?: string | null;
  // The stored Maps scrape (0060), when there is one. Used as Google's score
  // whenever GOOGLE_PLACES_API_KEY is unset, which is the keyless default.
  googleRating?: number | string | null;
  googleRatingCount?: number | null;
  googleHours?: string | null;
  checkedAt?: Date | string | null;
};

const GOOGLE_PLACE_URL = 'https://places.googleapis.com/v1/places';
const GOOGLE_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const YELP_URL = 'https://api.yelp.com/v3/businesses';
const TIMEOUT_MS = 10000;
const MAX_CONCURRENT = 4;

// A rating moves slowly; an hour is well inside what either source allows to
// be held, and it keeps a popular pin from spending a request per viewer.
const TTL = 60 * 60 * 1000;
// A scraped "Open . Closes 8 PM" is only true for so long. Past this the
// rating still shows and the opening state is dropped, rather than telling
// someone a shut restaurant is open.
const SCRAPED_HOURS_TTL = 60 * 60 * 1000;
const CACHE_LIMIT = 1000;

// The fields asked of Google. Places API (New) bills by field group, so this
// list is the bill: id/displayName are Essentials (free), rating and
// userRatingCount are Pro, currentOpeningHours is Enterprise. Trimming this
// list is the way to make the feature cheaper.
//
// `reviews` is deliberately NOT here. The panel shows each source's score and
// links out to its own listing rather than reproducing review text, which
// keeps the Enterprise review band off the bill and leaves the reviews where
// their authors put them.
const GOOGLE_FIELDS = [
  'id',
  'displayName',
  'rating',
  'userRatingCount',
  'googleMapsUri',
  'currentOpeningHours.openNow',
  'currentOpeningHours.weekdayDescriptions',
  'reservable',
].join(',');

// Kept on globalThis so dev reloads share one cache and one queue, as
// weather.ts does.
const state = ((globalThis as any).__chronopinPlaces ??= {
  cache: new Map<string, { promise: Promise<unknown>; expires: number }>(),
  active: 0,
  queue: [] as (() => Promise<void>)[],
}) as {
  cache: Map<string, { promise: Promise<unknown>; expires: number }>;
  active: number;
  queue: (() => Promise<void>)[];
};

export function hasAnySource(handles: PlaceHandles | null | undefined): boolean {
  return !!(handles && (handles.googlePlaceId || handles.yelpBusinessId || handles.reservationUrl));
}

// Everything known about a pin's place right now, or null when the pin has
// no place resolved. Never rejects for one source failing: a source that
// throws is left out and the rest still answer, because a Yelp outage should
// not take the Google score off the page.
export async function forPin(handles: PlaceHandles | null | undefined): Promise<PinPlaceInfo | null> {
  if (!hasAnySource(handles)) {
    return null;
  }
  const { googlePlaceId, yelpBusinessId, reservationUrl, reservationProvider } = handles!;
  const key = [googlePlaceId || '', yelpBusinessId || '', reservationUrl || ''].join('|');

  // Busyness is deliberately NOT part of the cached payload and is not
  // awaited: it moves in minutes where the rest moves in hours, and reading it
  // costs a browser. It is merged in below from its own short-lived cache.
  const busy = googlePlaceId ? busynessNow(googlePlaceId) : null;

  // Only the network calls are cached. The stored scrape and the busyness are
  // merged in afterwards, because both are already-local readings that change
  // on their own schedule - caching them alongside the API result would mean a
  // fresh `places:refresh` stayed invisible for up to an hour.
  const api = await cached(key, TTL, async () => {
    const [google, yelp] = await Promise.all([
      // The API is the better source - fresher, and Google's own terms - so a
      // key wins. Without one the stored scrape stands in for it.
      googlePlaceId && config.googlePlaces.apiKey ? settle('google', () => googlePlace(googlePlaceId)) : null,
      yelpBusinessId ? settle('yelp', () => yelpBusiness(yelpBusinessId)) : null,
    ]);
    return {
      googleScore: google?.score ?? null,
      googleHours: google?.hours ?? null,
      yelpScore: yelp?.score ?? null,
      yelpHours: yelp?.hours ?? null,
      yelpReservation: yelp?.reservation ?? null,
    };
  });

  const scraped = scrapedScore(handles!);
  const scores = [api.googleScore ?? scraped.score, api.yelpScore].filter((s): s is PlaceScore => !!s);
  // A hand-added link wins: a curator checked that it books THIS branch,
  // where Yelp only knows the business takes bookings somehow.
  const reservation = reservationUrl
    ? { url: reservationUrl, provider: reservationProvider || null }
    : api.yelpReservation;
  const hours = api.googleHours || scraped.hours || api.yelpHours || null;

  // Nothing to show at all - the pin has handles but no source answered.
  if (!scores.length && !reservation && !hours && !busy) {
    return null;
  }
  return { scores, hours, busy, reservation, sources: scores.map((s) => s.source) };
}

/* The stored Maps scrape (0060) */

// Google's score and opening state from what places:refresh last read, or
// empty when nothing has been read. Free: it is already on the row.
function scrapedScore(handles: PlaceHandles): { score?: PlaceScore; hours?: PlaceHours } {
  const rating = handles.googleRating == null ? null : Number(handles.googleRating);
  if (rating == null || Number.isNaN(rating)) {
    return {};
  }
  const read = handles.checkedAt ? new Date(handles.checkedAt).getTime() : 0;
  const fresh = read > 0 && Date.now() - read < SCRAPED_HOURS_TTL;
  const openNow = fresh ? openFromHours(handles.googleHours) : null;
  return {
    score: {
      source: 'Google',
      rating,
      ratingMax: 5,
      count: handles.googleRatingCount ?? null,
      // The place's own Maps page, which is where the rating was read.
      url: handles.googlePlaceId ? `https://www.google.com/maps/place/?q=place_id:${handles.googlePlaceId}` : null,
    },
    // Only the opening state travels, not Google's sentence: "Closes 8 PM"
    // read at noon means nothing at midnight.
    ...(openNow == null ? {} : { hours: { openNow, closing: null, week: [] } }),
  };
}

/* Google Places API (New) */

type GoogleResult = { score?: PlaceScore; hours?: PlaceHours | null };

async function googlePlace(placeId: string): Promise<GoogleResult | null> {
  if (!config.googlePlaces.apiKey) {
    return null;
  }
  const body = await limited(() =>
    fetchJson(`${GOOGLE_PLACE_URL}/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': config.googlePlaces.apiKey,
        'X-Goog-FieldMask': GOOGLE_FIELDS,
      },
    }),
  );
  if (!body) {
    return null;
  }

  const hours: PlaceHours | null = body.currentOpeningHours
    ? {
        openNow: body.currentOpeningHours.openNow ?? null,
        closing: null,
        week: Array.isArray(body.currentOpeningHours.weekdayDescriptions)
          ? body.currentOpeningHours.weekdayDescriptions
          : [],
      }
    : null;

  if (body.rating == null) {
    return { hours };
  }
  return {
    hours,
    score: {
      source: 'Google',
      rating: Number(body.rating),
      ratingMax: 5,
      count: body.userRatingCount != null ? Number(body.userRatingCount) : null,
      url: body.googleMapsUri || null,
    },
  };
}

// Resolves a place id from a name and a point, for scripts/places/resolve.ts.
// Kept here so the API key and the field-mask billing live in one file.
export async function findGooglePlaceId(
  name: string,
  latitude?: number | null,
  longitude?: number | null,
): Promise<{ placeId: string; name: string; address: string | null } | null> {
  if (!config.googlePlaces.apiKey || !name.trim()) {
    return null;
  }
  const body: Record<string, any> = { textQuery: name, maxResultCount: 1 };
  // A bias, not a filter: a restaurant whose pin sits on its street corner
  // should still match, but a chain's other branch should not win.
  if (latitude != null && longitude != null) {
    body.locationBias = { circle: { center: { latitude: +latitude, longitude: +longitude }, radius: 500 } };
  }
  const found = await limited(() =>
    fetchJson(GOOGLE_SEARCH_URL, {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': config.googlePlaces.apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }),
  );
  const place = found?.places?.[0];
  return place?.id
    ? { placeId: place.id, name: place.displayName?.text || name, address: place.formattedAddress || null }
    : null;
}

/* Yelp Fusion */

type YelpResult = {
  score?: PlaceScore;
  hours?: PlaceHours | null;
  reservation?: { url: string; provider: string } | null;
};

async function yelpBusiness(businessId: string): Promise<YelpResult | null> {
  if (!config.yelp.apiKey) {
    return null;
  }
  const headers = { Authorization: `Bearer ${config.yelp.apiKey}` };
  // One call: the score and the booking flag both come off the business, and
  // the panel does not reproduce review text, so /reviews is never asked for.
  const business = await limited(() =>
    fetchJson(`${YELP_URL}/${encodeURIComponent(businessId)}`, { headers }),
  );
  if (!business) {
    return null;
  }

  const open = business.hours?.[0];
  const hours: PlaceHours | null =
    open?.is_open_now != null ? { openNow: !!open.is_open_now, closing: null, week: [] } : null;

  // Yelp says a business takes reservations through its `transactions` list.
  // The link is Yelp's own page for it - a real URL Yelp returned, never one
  // built from the alias.
  const takesReservations = Array.isArray(business.transactions) && business.transactions.includes('restaurant_reservation');
  const reservation = takesReservations && business.url ? { url: business.url as string, provider: 'Yelp' } : null;

  if (business.rating == null) {
    return { hours, reservation };
  }
  return {
    hours,
    reservation,
    score: {
      source: 'Yelp',
      rating: Number(business.rating),
      ratingMax: 5,
      count: business.review_count != null ? Number(business.review_count) : null,
      url: business.url || null,
    },
  };
}

// Resolves a Yelp business alias from a name and a point, for the resolve
// script. Yelp's /matches endpoint wants a street address, which a pin does
// not reliably have, so this searches by name around the coordinates.
export async function findYelpBusinessId(
  name: string,
  latitude?: number | null,
  longitude?: number | null,
): Promise<{ businessId: string; name: string; address: string | null } | null> {
  if (!config.yelp.apiKey || !name.trim() || latitude == null || longitude == null) {
    return null;
  }
  const query = new URLSearchParams({
    term: name,
    latitude: String(+latitude),
    longitude: String(+longitude),
    radius: '1000',
    limit: '1',
  });
  const body = await limited(() =>
    fetchJson(`${YELP_URL}/search?${query}`, { headers: { Authorization: `Bearer ${config.yelp.apiKey}` } }),
  );
  const business = body?.businesses?.[0];
  return business?.alias
    ? {
        businessId: business.alias,
        name: business.name || name,
        address: business.location?.display_address?.join(', ') || null,
      }
    : null;
}

/* Plumbing */

// Runs `load`, and turns a failure into null with a log line. One source
// being down must never take the others off the page.
async function settle<T>(what: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (err) {
    log.error(`places ${what}:`, (err as Error)?.message);
    return null;
  }
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const reason = body?.error?.message || body?.error?.description || '';
    const err = new Error(`${init?.method || 'GET'} ${url.split('?')[0]} failed with ${res.status}: ${reason}`) as Error & {
      status: number;
    };
    err.status = res.status;
    throw err;
  }
  return body;
}

// At most MAX_CONCURRENT calls at once. Both APIs bill or rate-limit per
// request, and a timeline of restaurant cards would otherwise open one
// connection per card.
function limited<T>(run: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    state.queue.push(() => run().then(resolve, reject));
    drain();
  });
}

function drain() {
  while (state.active < MAX_CONCURRENT && state.queue.length) {
    state.active++;
    state.queue.shift()!().finally(() => {
      state.active--;
      drain();
    });
  }
}

// Shares one lookup between everyone viewing the same pin, including requests
// that arrive while it is in flight. Failures are not kept.
function cached<T>(key: string, ttl: number, load: () => Promise<T>): Promise<T> {
  const hit = state.cache.get(key);
  if (hit && hit.expires > Date.now()) {
    return hit.promise as Promise<T>;
  }

  const promise = load();
  state.cache.delete(key);
  state.cache.set(key, { promise, expires: Date.now() + ttl });
  promise.catch(() => {
    if (state.cache.get(key)?.promise === promise) {
      state.cache.delete(key);
    }
  });

  if (state.cache.size > CACHE_LIMIT) {
    state.cache.delete(state.cache.keys().next().value!);
  }
  return promise;
}
