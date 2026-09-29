// How busy a place is right now, read off its Google Maps page.
//
// THIS IS UNOFFICIAL AND IT IS EXPECTED TO BREAK.
//
// Google publishes popular times, live busyness and wait times in Maps and in
// Search, and documents them as a Business Profile display feature - they are
// not fields of the Places API, and there is no other sanctioned source. Yelp's
// waitlist endpoint is gated behind a partnership. So reading the Maps page is
// the only route to the number, it is against Google's terms of service, and
// the markup it depends on is Google's to change without notice. That trade
// was made deliberately; everything below is built so that losing it costs
// nothing but the busy bar:
//
//   - it never throws: a failure is null and the rest of the panel renders
//   - it runs behind a circuit breaker, so a Google that has stopped
//     answering is asked once every BREAKER_MS instead of once per page view
//   - it holds one browser at a time, because Chromium is the expensive part
//   - it is the only file that knows about any of this; src/server/places.ts
//     just calls liveBusyness() and accepts null
//
// What was actually observed when this was written (2026-09-21), probing from
// a datacenter IP:
//
//   plain fetch of the place page      map-tile state only, no place data
//   /search?tbm=map&tch=1 with pb      name and place id, no busyness arrays
//   headless Chromium on the place page  renders the panel (name, rating,
//                                      review count) but no Popular times
//                                      section, and a second load dropped the
//                                      review count too
//   google.com/search knowledge panel  nothing without JavaScript
//
// So this returned null from that machine, and the busy bar did not render.
// It is kept wired because the same page does carry the section for ordinary
// browsers, and what Google serves varies by IP reputation, locale and
// session; if it starts answering, the panel lights up with no other change.
// If it is still silent where this runs and the number matters, the honest
// alternative is a paid provider (BestTime.app and SafeGraph both sell
// popular-times feeds) - swap the body of scrape() for that call and the rest
// of this file, the API and the UI stay as they are.

import config from './config';
import log from './util/log';

export type PlaceBusy = {
  // 0-100, how full it is now against its own busiest hour.
  live: number | null;
  // 0-100, what this hour is normally like, so "live" has something to mean.
  typical: number | null;
  // Minutes, when Google prints a wait estimate for the current hour.
  waitMinutes: number | null;
  // Google's own wording, normalised: how now compares with normal.
  trend: 'much-less' | 'less' | 'usual' | 'more' | 'much-more' | null;
};

const PLACE_URL = 'https://www.google.com/maps/place/?q=place_id:';
const NAVIGATION_MS = 30000;
// Busyness is the fastest-moving thing on the panel, but each read costs a
// browser, so it is not read more often than this per place.
const TTL = 10 * 60 * 1000;
const CACHE_LIMIT = 500;
// After this many failures in a row, stop launching Chromium and answer null
// until BREAKER_MS has passed. Without it, a Google that never answers would
// cost a browser launch on every restaurant pin anyone opens.
const BREAKER_AFTER = 3;
const BREAKER_MS = 30 * 60 * 1000;

type Entry = {
  promise: Promise<PlaceBusy | null>;
  expires: number;
  // Set once the promise settles, so busynessNow can answer without waiting.
  settled: boolean;
  value: PlaceBusy | null;
};

const state = ((globalThis as any).__chronopinBusyness ??= {
  cache: new Map<string, Entry>(),
  failures: 0,
  openedAt: 0,
  chain: Promise.resolve() as Promise<unknown>,
}) as {
  cache: Map<string, Entry>;
  failures: number;
  openedAt: number;
  chain: Promise<unknown>;
};

// How busy the place with this Google place id is now, or null - which is the
// ordinary answer, not an error. Never rejects.
export function liveBusyness(placeId: string): Promise<PlaceBusy | null> {
  if (!placeId || config.env === 'test') {
    return Promise.resolve(null);
  }
  const hit = state.cache.get(placeId);
  if (hit && hit.expires > Date.now()) {
    return hit.promise;
  }
  if (breakerOpen()) {
    return Promise.resolve(null);
  }

  // One browser at a time: several pins opening at once queue instead of
  // launching a Chromium each.
  const promise = (state.chain = state.chain.then(() => scrape(placeId))).then(
    (busy) => {
      state.failures = busy ? 0 : state.failures + 1;
      if (state.failures >= BREAKER_AFTER) {
        state.openedAt = Date.now();
      }
      return busy as PlaceBusy | null;
    },
    (err) => {
      log.error('busyness:', (err as Error)?.message);
      state.failures += 1;
      if (state.failures >= BREAKER_AFTER) {
        state.openedAt = Date.now();
      }
      return null;
    },
  );

  const entry: Entry = { promise, expires: Date.now() + TTL, settled: false, value: null };
  promise.then((busy) => {
    entry.settled = true;
    entry.value = busy;
  });
  state.cache.set(placeId, entry);
  if (state.cache.size > CACHE_LIMIT) {
    state.cache.delete(state.cache.keys().next().value!);
  }
  return promise;
}

// The busyness for this place **without waiting for it**: whatever a previous
// read settled on, or null while one is in flight.
//
// This is what the API uses, and the reason it exists is measured: reading the
// Maps page costs a Chromium launch, which took 4.4s of a blocked request on a
// cold cache - all of it to learn that Google serves no busyness here. The
// ratings and the booking link are fast and are the valuable part, so they
// must never queue behind this. A first view therefore shows no busy bar even
// where the scrape does work; the next view within the TTL picks it up.
export function busynessNow(placeId: string): PlaceBusy | null {
  const hit = state.cache.get(placeId);
  if (hit && hit.expires > Date.now()) {
    return hit.settled ? hit.value : null;
  }
  // Start one for next time, and do not wait for it. liveBusyness never
  // rejects, so there is nothing to catch here.
  void liveBusyness(placeId);
  return null;
}

function breakerOpen(): boolean {
  if (state.failures < BREAKER_AFTER) {
    return false;
  }
  if (Date.now() - state.openedAt > BREAKER_MS) {
    // Let one through to see whether it works again.
    state.failures = 0;
    return false;
  }
  return true;
}

async function scrape(placeId: string): Promise<PlaceBusy | null> {
  // Imported here, not at the top: puppeteer is heavy and most pins never
  // reach this file at all.
  const { launchBrowser } = await import('./scrape');
  const browser = await launchBrowser();
  try {
    const [page] = await browser.pages();
    page.setDefaultNavigationTimeout(NAVIGATION_MS);
    // The same rename the scraper uses: "HeadlessChrome" in the user agent is
    // what bot checks look for.
    await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'));
    // Popular times are only labelled in a language we can read back.
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.goto(`${PLACE_URL}${encodeURIComponent(placeId)}&hl=en&gl=us`, { waitUntil: 'networkidle2' });
    // The page only collects; the reading happens in Node, where it can be
    // tested against a captured page without a browser (googleBusyness.test.ts).
    const read = await page.evaluate(() => ({
      labels: Array.from(document.querySelectorAll('[aria-label]'))
        .map((el) => el.getAttribute('aria-label') || '')
        .filter(Boolean),
      text: document.body?.innerText || '',
    }));
    return readBusyness(read);
  } finally {
    await browser.close().catch(() => {});
  }
}

// Reads the busyness out of what the Maps page said. Everything it looks for
// is a label Google writes for screen readers, which moves less often than
// class names do - but it is still Google's wording, so every read is guarded
// and any miss is null. Exported for its test: this is the part that rots.
export function readBusyness({ labels, text }: { labels: string[]; text: string }): PlaceBusy | null {
  // The live bar: "Currently 45% busy, usually 70% busy".
  let live: number | null = null;
  let typical: number | null = null;
  for (const label of labels) {
    const now = label.match(/currently\s+(\d{1,3})\s*%/i);
    if (now) {
      live = Number(now[1]);
    }
    const usual = label.match(/usually\s+(\d{1,3})\s*%/i);
    if (usual) {
      typical = Number(usual[1]);
    }
    if (live != null && typical != null) {
      break;
    }
  }
  // The hour bars carry the same numbers when the live bar is absent: the one
  // marked as the current hour is this hour's normal load.
  if (typical == null) {
    const hour = labels.find((l) => /\b(\d{1,3})\s*%\s*busy/i.test(l) && /current|now/i.test(l));
    const match = hour?.match(/(\d{1,3})\s*%/);
    if (match) {
      typical = Number(match[1]);
    }
  }

  // "Usually a 30 min wait", "Wait time: up to 45 min".
  let waitMinutes: number | null = null;
  const wait = text.match(/(?:usually\s+(?:a|an)\s+|wait(?:\s+time)?[:\s]+(?:up\s+to\s+)?)(\d{1,3})\s*(?:-|to|–)?\s*(\d{1,3})?\s*min/i);
  if (wait) {
    // A range ("30-45 min") reads as its upper end: that is the wait someone
    // should plan for, and the lower one flatters the place.
    waitMinutes = Number(wait[2] || wait[1]);
  }

  const trend = (() => {
    const t = text.toLowerCase();
    if (/not (too )?busy/.test(t)) return 'much-less' as const;
    if (/less busy than usual/.test(t)) return 'less' as const;
    if (/as busy as it gets|very busy/.test(t)) return 'much-more' as const;
    if (/busier than usual/.test(t)) return 'more' as const;
    if (/usually.*busy|as busy as usual/.test(t)) return 'usual' as const;
    return null;
  })();

  if (live == null && typical == null && waitMinutes == null && trend == null) {
    return null;
  }
  return { live, typical, waitMinutes, trend };
}
