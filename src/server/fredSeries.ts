// A series from FRED, the St. Louis Fed's economic database, which republishes
// the government's own releases: the PCE price index is BEA's, the CPI is
// BLS's. This is what puts the inflation gauge's own curve on a macro pin,
// the way eiaSeries.ts puts the reserve's stock level on an SPR pin.
//
// WHY THE CSV. FRED's API (api.stlouisfed.org) needs a registered key. The
// fredgraph.csv behind every "Download" link on a series page does not, and
// it can apply FRED's own units transformation server-side, so a series is
// fetched as the figure a reader hears about ("PCE prices up 3.4% on a year
// ago") rather than as an index level that nobody quotes.
//
// The series id carries that transformation after a colon: "PCEPI" is the
// index, "PCEPI:PC1" is its percent change from a year ago. Only the handle
// is stored (PinSeries, 0062); the numbers are read on view.
//
// The CSV has no title, units or release schedule, so the pin's label names
// the chart and the units come from the transformation. The fetch is made
// over HTTP/1.1 by Node's fetch; FRED resets an HTTP/2 stream from curl.

import log from './util/log';
import type { SeriesPoint } from './eiaSeries';

const CSV_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv';
const PAGE_URL = 'https://fred.stlouisfed.org/series';
const TIMEOUT_MS = 15000;
// A monthly release changes the number once a month, so an hour is far more
// often than it can move and still recovers from a bad read on its own.
const TTL_MS = 60 * 60 * 1000;
const ERROR_TTL_MS = 5 * 60 * 1000;
const UA = 'ChronoPin/1.0 (https://chronopin.com; tech@chronopin.com) series fetch';

// FRED's units codes worth putting on a pin, and what each one reads as.
const TRANSFORMATIONS: Record<string, string | null> = {
  LIN: null,
  PC1: 'Percent Change from Year Ago',
  PCH: 'Percent Change',
  PCA: 'Percent Change at Annual Rate',
  CHG: 'Change',
  CH1: 'Change from Year Ago',
};

export type FredSeries = {
  seriesId: string;
  title: string | null;
  units: string | null;
  frequency: 'weekly' | 'monthly';
  releaseDate: string | null;
  nextReleaseDate: string | null;
  sourceUrl: string;
  points: SeriesPoint[];
};

type Entry = { expires: number; promise: Promise<FredSeries | null> };
const cache = new Map<string, Entry>();

// "PCEPI:PC1" -> { id: 'PCEPI', transformation: 'PC1' }. A bare id is the
// series as published. null for a handle that could not be a FRED series, so
// nothing else is ever put in the URL.
export function parseFredId(seriesId: string): { id: string; transformation: string } | null {
  const m = /^([A-Z0-9_]{1,40})(?::([A-Z0-9]{2,3}))?$/.exec(seriesId.trim().toUpperCase());
  if (!m) return null;
  const transformation = m[2] ?? 'LIN';
  return transformation in TRANSFORMATIONS ? { id: m[1], transformation } : null;
}

// The page a reader clicks through to: the series' own page, which has FRED's
// chart, table, and the release it comes from.
export const fredUrl = (seriesId: string): string => {
  const parsed = parseFredId(seriesId);
  return `${PAGE_URL}/${encodeURIComponent(parsed?.id ?? seriesId)}`;
};

// One CSV: a header, then "YYYY-MM-DD,value" rows. A missing observation is
// ".", which has no value and is skipped rather than read as zero.
export function parseCsv(csv: string, seriesId: string): FredSeries {
  const points: SeriesPoint[] = [];
  for (const line of csv.split(/\r?\n/).slice(1)) {
    const [day, raw] = line.split(',');
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day.trim()) || !raw || !/\d/.test(raw)) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) points.push({ day: day.trim(), value });
  }
  points.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));

  // Weekly rows are a week apart, everything else here is a month or more.
  const gap = points.length > 1 ? Date.parse(points[1].day) - Date.parse(points[0].day) : Infinity;
  const parsed = parseFredId(seriesId);

  return {
    seriesId,
    title: null,
    units: parsed ? TRANSFORMATIONS[parsed.transformation] : null,
    frequency: gap <= 10 * 86_400_000 ? 'weekly' : 'monthly',
    releaseDate: null,
    nextReleaseDate: null,
    sourceUrl: fredUrl(seriesId),
    points,
  };
}

async function load(seriesId: string): Promise<FredSeries | null> {
  const parsed = parseFredId(seriesId);
  if (!parsed) throw new Error(`${seriesId} is not a FRED series id`);
  const url = `${CSV_URL}?id=${encodeURIComponent(parsed.id)}&transformation=${parsed.transformation.toLowerCase()}`;
  const response = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/csv' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`FRED ${response.status} for ${seriesId}`);
  }
  const series = parseCsv(await response.text(), seriesId);
  // A 200 with no rows is an unknown series or a layout change, not an empty
  // one: say so rather than caching nothing for an hour.
  if (!series.points.length) {
    throw new Error(`FRED served no data rows for ${seriesId}`);
  }
  return series;
}

// The series, cached. A failed read is cached briefly too, so a page that is
// down does not turn every pin view into a fetch.
export function getFredSeries(seriesId: string): Promise<FredSeries | null> {
  const id = seriesId.trim().toUpperCase();
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) return hit.promise;

  const promise = load(id).catch((err) => {
    log.warn('fred series', id, (err as Error).message);
    const entry = cache.get(id);
    if (entry) entry.expires = Date.now() + ERROR_TTL_MS;
    return null;
  });
  cache.set(id, { expires: Date.now() + TTL_MS, promise });
  return promise;
}

export function clearFredCache(): void {
  cache.clear();
}
