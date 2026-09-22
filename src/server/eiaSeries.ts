// A weekly US Energy Information Administration series, read from the page
// that publishes it. This is what puts a live government chart on a pin: the
// Strategic Petroleum Reserve pins show the reserve's own stock level, so the
// pin's event sits on the curve it moved.
//
// WHY THE HTML AND NOT THE API. EIA's v2 API (api.eia.gov) needs a registered
// key, and the .xls "series history" download is Excel BIFF, which would mean
// a spreadsheet dependency for one number a week. The LeafHandler page that
// the series' public URL already points at carries the whole history as an
// HTML table - Year-Month rows with (MM/DD, value) pairs across the weeks -
// so it parses with no key and no new package. The page is also the one a
// reader clicks through to, which keeps what the pin shows and what EIA shows
// the same thing.
//
// Values are whatever the series is published in: WCSSTUS1, the SPR's crude
// stocks, is thousand barrels. The units are read off the page rather than
// assumed, so a caller can label the axis without knowing the series.

import log from './util/log';

const LEAF_URL = 'https://www.eia.gov/dnav/pet/hist/LeafHandler.ashx';
const TIMEOUT_MS = 15000;
// The weekly report lands once a week (Wednesdays, with holiday slips), so an
// hour is far more often than the number can change and still recovers from a
// bad read on its own.
const TTL_MS = 60 * 60 * 1000;
const ERROR_TTL_MS = 5 * 60 * 1000;
const UA = 'ChronoPin/1.0 (https://chronopin.com; tech@chronopin.com) series fetch';

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

export type SeriesPoint = {
  // The week's day key, YYYY-MM-DD, as EIA dates the week (its last day).
  day: string;
  value: number;
};

export type EiaSeries = {
  seriesId: string;
  title: string | null;
  units: string | null;
  // What EIA says about its own publishing schedule, when the page states it.
  releaseDate: string | null;
  nextReleaseDate: string | null;
  sourceUrl: string;
  points: SeriesPoint[];
};

type Entry = { expires: number; promise: Promise<EiaSeries | null> };
const cache = new Map<string, Entry>();

export const seriesUrl = (seriesId: string, frequency = 'W') =>
  `${LEAF_URL}?n=PET&s=${encodeURIComponent(seriesId)}&f=${encodeURIComponent(frequency)}`;

// EIA writes a series id in upper case; a stored one is normalised so two
// spellings share a cache entry and a URL.
export const normaliseSeriesId = (seriesId: string) => seriesId.trim().toUpperCase();

const stripTags = (html: string) => html.replace(/<[^>]+>/g, ' ');

function decode(html: string): string {
  return html
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

const cells = (row: string): string[] =>
  [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((m) => decode(stripTags(m[1])));

// "2026-Sep" -> { year: 2026, month: 9 }; anything else -> null.
function yearMonth(label: string): { year: number; month: number } | null {
  const m = /^(\d{4})[-\s]+([A-Za-z]{3})/.exec(label);
  const month = m && MONTHS[m[2].toLowerCase()];
  return m && month ? { year: Number(m[1]), month } : null;
}

// A number as the table writes it: "270,455" -> 270455. A withheld or missing
// week is "W", "NA", "-" or empty, and has no value.
function amount(text: string): number | null {
  if (!/\d/.test(text)) return null;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

// A week's (MM/DD, value) pair, dated into the row's year. EIA's rows run
// January to December, so a December row carrying an early-January date is the
// next year's week - which happens because a week is dated by the Friday it
// ends on.
function dayOf(md: string, year: number, month: number): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})$/.exec(md.trim());
  if (!m) return null;
  const cellMonth = Number(m[1]);
  const day = Number(m[2]);
  if (cellMonth < 1 || cellMonth > 12 || day < 1 || day > 31) return null;
  // Only a December row can spill into January, and only a January row back
  // into December; anything else is the row's own year.
  const rollForward = month === 12 && cellMonth === 1;
  const rollBack = month === 1 && cellMonth === 12;
  const y = year + (rollForward ? 1 : rollBack ? -1 : 0);
  return `${y}-${String(cellMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function parseSeries(html: string, seriesId: string): EiaSeries {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]);
  const points: SeriesPoint[] = [];
  for (const row of rows) {
    const c = cells(row);
    const ym = c.length ? yearMonth(c[0]) : null;
    if (!ym) continue;
    // The rest of the row is (date, value) pairs, one per week of the month.
    for (let i = 1; i + 1 < c.length; i += 2) {
      const day = dayOf(c[i], ym.year, ym.month);
      const value = amount(c[i + 1]);
      if (day && value != null) points.push({ day, value });
    }
  }
  points.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  const text = decode(stripTags(html.replace(/(?:<script|<style)[\s\S]*?(?:<\/script>|<\/style>)/gi, ' ')));
  const titled = /Weekly\s+([^:]{4,120}?)\s+\(/i.exec(text);
  const united = /\(([^()]{2,40}?(?:Barrels|Dollars|Percent|Days|Cubic Feet|Gallons)[^()]{0,20})\)/i.exec(text);
  const released = /Release Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(text);
  const next = /Next Release Date:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i.exec(text);

  return {
    seriesId,
    title: titled ? `Weekly ${titled[1]}`.trim() : null,
    units: united ? united[1].trim() : null,
    releaseDate: released ? isoDay(released[1]) : null,
    nextReleaseDate: next ? isoDay(next[1]) : null,
    sourceUrl: seriesUrl(seriesId),
    points,
  };
}

// "9/16/2026" -> "2026-09-16".
function isoDay(us: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(us);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null;
}

async function load(seriesId: string): Promise<EiaSeries | null> {
  const url = seriesUrl(seriesId);
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`EIA ${response.status} for ${seriesId}`);
  }
  const series = parseSeries(await response.text(), seriesId);
  // A page that answers 200 with no readable table is a layout change, not an
  // empty series: say so rather than caching nothing for an hour.
  if (!series.points.length) {
    throw new Error(`EIA served no data rows for ${seriesId}`);
  }
  return series;
}

// The series, cached. A failed read is cached briefly too, so a page that is
// down does not turn every pin view into a fetch.
export function getSeries(seriesId: string): Promise<EiaSeries | null> {
  const id = normaliseSeriesId(seriesId);
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) return hit.promise;

  const promise = load(id).catch((err) => {
    log.warn('eia series', id, (err as Error).message);
    const entry = cache.get(id);
    if (entry) entry.expires = Date.now() + ERROR_TTL_MS;
    return null;
  });
  cache.set(id, { expires: Date.now() + TTL_MS, promise });
  return promise;
}

export function clearSeriesCache(): void {
  cache.clear();
}
