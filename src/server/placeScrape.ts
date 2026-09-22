// A place's rating, how many people rated it, its opening state and how busy
// it is - read off its Google Maps page with the app's own browser.
//
// THIS IS UNOFFICIAL. Scraping Maps is against Google's terms and the page is
// Google's to change without notice. It is here because it is the only route
// that needs no key and costs nothing per view, which is what Ian asked for;
// the Places API path in places.ts stays as the better source for anyone who
// sets GOOGLE_PLACES_API_KEY, and it wins when a key is present.
//
// What makes it work (measured 2026-09-21, after three flaky attempts):
// **wait for the rating element, do not sleep.** `networkidle2` plus a fixed
// delay returned a reduced panel about half the time - nav chips and nothing
// else - which is what made an earlier read look impossible. Waiting for
// `[aria-label*="stars"]` gave 4 usable reads out of 4 across two places.
//
// One visit collects everything, because the browser launch is the expensive
// part: rating, count, hours and busyness all come off the same page.
//
// Yelp cannot be scraped. `yelp.com/biz/...` answers **403 to this browser
// too**, not just to curl, so a Yelp score needs the (free) Fusion key and
// there is no keyless route to it.

import { readBusyness, type PlaceBusy } from './googleBusyness';
import log from './util/log';

export type ScrapedPlace = {
  // What Google calls the place, so a wrong match is visible in a dry run.
  name: string | null;
  rating: number | null;
  ratingCount: number | null;
  // Google's own wording: "Open · Closes 8 PM", "Closed · Opens 5 PM Thu".
  hours: string | null;
  busy: PlaceBusy | null;
};

const PLACE_URL = 'https://www.google.com/maps/place/?q=place_id:';
const NAVIGATION_MS = 45000;
// How long to wait for the rating to render. The panel is slow and sometimes
// arrives reduced; this is what separates a real miss from an early read.
const RATING_MS = 20000;

// Reads one place. Returns null when the page never showed a rating, which is
// a real answer for a place nobody has rated. Throws only if the browser
// itself fails, so callers can tell a bad page from a bad Chromium.
export async function scrapeGooglePlace(placeId: string): Promise<ScrapedPlace | null> {
  if (!placeId) {
    return null;
  }
  const { launchBrowser } = await import('./scrape');
  const browser = await launchBrowser();
  try {
    const [page] = await browser.pages();
    page.setDefaultNavigationTimeout(NAVIGATION_MS);
    // The same rename the scraper uses: bot checks look for "HeadlessChrome".
    await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'));
    // The labels below are only in a language we can read back.
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    await page.goto(`${PLACE_URL}${encodeURIComponent(placeId)}&hl=en&gl=us`, { waitUntil: 'domcontentloaded' });

    let rated = true;
    try {
      await page.waitForSelector('[aria-label*="stars"]', { timeout: RATING_MS });
    } catch {
      // Either an unrated place or a reduced panel; readPlace tells them apart
      // by whether it found a name.
      rated = false;
    }

    const read = await page.evaluate(() => ({
      labels: Array.from(document.querySelectorAll('[aria-label]'))
        .map((el) => el.getAttribute('aria-label') || '')
        .filter(Boolean),
      text: document.body?.innerText || '',
      heading: document.querySelector('h1')?.textContent || null,
    }));
    if (!rated && !read.heading) {
      log.error('placeScrape: no panel for', placeId);
      return null;
    }
    return readPlace(read);
  } finally {
    await browser.close().catch(() => {});
  }
}

// Pulls the numbers out of what the Maps page said. Every read is guarded and
// any miss is null - this is the part that rots when Google moves the markup,
// so it is pure and tested (placeScrape.test.ts).
export function readPlace({
  labels,
  text,
  heading,
}: {
  labels: string[];
  text: string;
  heading: string | null;
}): ScrapedPlace {
  // Google publishes the rating as an aria-label, "4.6 stars", which survives
  // markup changes better than the number's position in the panel text.
  const starLabel = labels.find((l) => /^\s*[0-5](\.\d)?\s*stars?\b/i.test(l));
  const starMatch = starLabel?.match(/([0-5](?:\.\d)?)/);
  const rating = starMatch ? Number(starMatch[1]) : null;

  // The count sits immediately after the rating in the panel: "4.6\n(2,275)".
  // Two rules, both learned from wrong numbers that looked plausible:
  //
  // 1. It MUST be matched as a PAIR with the rating, never as "the first
  //    number in brackets on the page" - that read (707) out of the phone
  //    number "(707) 944-2380" and gave The French Laundry 707 ratings.
  // 2. Take the LARGEST matching pair, not the first. Star Wars: Galaxy's
  //    Edge read 685, 685, then 42 across three loads: some renders carry a
  //    second "4.8 (42)" block, and the first pair in the text is then the
  //    wrong one. A place's own total is the biggest count on its panel.
  const counts = Array.from(text.matchAll(/([0-5](?:\.\d)?)\s*\(\s*([\d,]+)\s*\)/g))
    .filter((m) => rating == null || Number(m[1]) === rating)
    .map((m) => Number(m[2].replace(/,/g, '')))
    .filter((n) => Number.isFinite(n));
  const ratingCount = counts.length ? Math.max(...counts) : null;

  // "Open · Closes 8 PM" / "Closed · Opens 5 PM Thu", as Google words it.
  const hoursMatch = text.match(/\b(Open|Closed|Closes|Opens|Open 24 hours|Temporarily closed|Permanently closed)\b[^\n]{0,40}/);
  const hours = hoursMatch ? hoursMatch[0].trim() : null;

  return {
    name: heading?.trim() || null,
    rating,
    ratingCount,
    hours,
    // The same page carries busyness, so it is read here rather than in a
    // second visit.
    busy: readBusyness({ labels, text }),
  };
}

// Whether Google's wording means the place is open now, or null when it said
// nothing useful. "Closes 8 PM" on its own is an open place; "Opens 5 PM" is
// a shut one.
export function openFromHours(hours: string | null | undefined): boolean | null {
  if (!hours) {
    return null;
  }
  if (/permanently closed|temporarily closed/i.test(hours)) {
    return false;
  }
  if (/^open\b/i.test(hours)) {
    return true;
  }
  if (/^closed\b/i.test(hours)) {
    return false;
  }
  if (/^closes\b/i.test(hours)) {
    return true;
  }
  if (/^opens\b/i.test(hours)) {
    return false;
  }
  return null;
}

/* Keyless place-id lookup */

const MAPS_SEARCH = 'https://www.google.com/maps/search/';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const LOOKUP_TIMEOUT_MS = 25000;

// A place id from a name, with no API key and no browser.
//
// The Maps *search* page is a shell, but the `<link rel="preload" href="/search?tbm=map&...&pb=...">`
// it carries points at the endpoint that actually answers, and that response
// contains the place id, the name Google matched and its address. This is the
// only keyless route to a place id; reading the place's *rating* still needs
// either a key or the browser scrape above.
//
// Returns null when nothing matched, which includes Google deciding the query
// was too vague. Never throws for a bad match - only for a network failure.
export async function findGooglePlaceIdKeyless(
  query: string,
): Promise<{ placeId: string; name: string | null; address: string | null } | null> {
  if (!query.trim()) {
    return null;
  }
  const headers = { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' };
  const shell = await fetch(`${MAPS_SEARCH}${encodeURIComponent(query)}/`, {
    headers,
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  }).then((r) => r.text());

  // The data endpoint, with the pb parameter Google built for this query.
  const href = shell.match(/href="(\/search\?tbm=map[^"]*)"/)?.[1];
  if (!href) {
    return null;
  }
  const path = href.replace(/&amp;/g, '&');
  const body = await fetch(`https://www.google.com${path}`, {
    headers,
    signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
  }).then((r) => r.text());

  return readPlaceId(body);
}

// Pulls the first place id, and the name and address beside it, out of the
// Maps data response. Pure and exported so it can be tested against a
// captured payload.
export function readPlaceId(body: string): { placeId: string; name: string | null; address: string | null } | null {
  const placeId = body.match(/"(ChIJ[A-Za-z0-9_-]{10,})"/)?.[1] ?? null;
  if (!placeId) {
    return null;
  }
  // The address follows the id in the same record. It must match both
  // "11 Madison Ave, New York" and "Refshalevej 96, 1432 Kobenhavn" - much of
  // Europe puts the number last, and an earlier digit-first pattern returned
  // null for Noma and Maido, which is worse than useless: it silently removed
  // the only check on a wrong match.
  const after = body.slice(body.indexOf(`"${placeId}"`));
  // An address, not prose. The payload also carries *review text*, and a
  // pattern loose enough for "Refshalevej 96, 1432 Kobenhavn" happily matched
  // "I loved it so much. Really so much fun packed into 1 day. ..." for
  // Chimelong Ocean Kingdom - a comma and a digit is all it took. So a
  // candidate is rejected if it reads like a sentence (sentence-ending
  // punctuation, or an apostrophe), and it must be short.
  const address =
    (after.match(/"((?:\d+|[A-Z][^"\\]{2,40}\s\d+)[^"\\]{0,70},[^"\\]{2,70})"/g) ?? [])
      .map((m) => m.slice(1, -1))
      .find(
        (candidate) =>
          candidate.length <= 120 &&
          // Not prose, and not a date: "Aug 20, 2026" also has a comma and
          // digits, and turned up as Magic Kingdom's "address".
          !/[.!?]\s|['’]/.test(candidate) &&
          !/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s*\d{4}$/i.test(candidate),
      ) ?? null;
  const name = body.match(/^\)\]\}'\s*\n?\[\["([^"\\]{2,120})"/m)?.[1] ?? null;
  return { placeId, name, address };
}
