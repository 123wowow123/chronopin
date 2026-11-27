// A series from Ornn's Compute Price Index (OCPI): the daily rental price of
// one GPU model in USD per GPU-hour, settled once a day. Ornn's public-index
// API is keyless and free; it serves the latest three months of history, which
// is exactly the window a rental-price panel wants.
//
// The handle is the GPU's name as Ornn spells it ("H100 SXM", "B200",
// "A100 SXM4"); only that is stored (PinSeries, 0271). The numbers are read on
// view and never copied, like every other source.

import log from './util/log';
import type { SeriesPoint } from './eiaSeries';

const API = 'https://data.ornn.com/api/public-index/gpu';
const PAGE_URL = 'https://data.ornn.com/home';
const TIMEOUT_MS = 20000;
// The index settles once a day at midnight ET.
const TTL_MS = 60 * 60 * 1000;
const ERROR_TTL_MS = 5 * 60 * 1000;
const UA = 'ChronoPin/1.0 (https://chronopin.com) series fetch';

export type OrnnSeries = {
  seriesId: string;
  title: string | null;
  units: string | null;
  frequency: 'weekly' | 'monthly';
  releaseDate: string | null;
  nextReleaseDate: string | null;
  sourceUrl: string;
  points: SeriesPoint[];
};

// "H100 SXM", "RTX PRO 6000 WS": letters, digits, spaces and dashes only, so
// nothing else is ever put into the request path.
export const parseOrnnId = (seriesId: string): string | null => {
  const id = seriesId.trim().replace(/\s+/g, ' ').toUpperCase();
  return /^[A-Z0-9][A-Z0-9 -]{0,40}$/.test(id) ? id : null;
};

// The page on Ornn's site for a GPU: the first word of the name, lower case
// ("H100 SXM" -> /home/h100).
export const ornnUrl = (seriesId: string): string => `${PAGE_URL}/${(parseOrnnId(seriesId) ?? 'h100').split(' ')[0].toLowerCase()}`;

export function parseHistory(body: unknown, seriesId: string): OrnnSeries | null {
  const rows = (body as { data?: { timestamp?: string; index_value?: number }[] } | null)?.data;
  if (!Array.isArray(rows)) throw new Error('Ornn history shape changed');
  // Settlement stamps are 04:00/05:00Z (midnight ET): the UTC date is the day it settled.
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const day = typeof r.timestamp === 'string' ? r.timestamp.slice(0, 10) : '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && typeof r.index_value === 'number' && Number.isFinite(r.index_value)) byDay.set(day, r.index_value);
  }
  const points = [...byDay].map(([day, value]) => ({ day, value })).sort((a, b) => (a.day < b.day ? -1 : 1));
  if (!points.length) return null;
  return {
    seriesId,
    title: `${seriesId} rental price (Ornn Compute Price Index)`,
    units: 'USD per GPU-hour',
    frequency: 'weekly',
    releaseDate: null,
    nextReleaseDate: null,
    sourceUrl: ornnUrl(seriesId),
    points,
  };
}

const cache = new Map<string, { expires: number; promise: Promise<OrnnSeries | null> }>();

export function getOrnnSeries(seriesId: string): Promise<OrnnSeries | null> {
  const id = parseOrnnId(seriesId);
  if (!id) return Promise.resolve(null);
  const hit = cache.get(id);
  if (hit && hit.expires > Date.now()) return hit.promise;
  const promise = fetch(`${API}/${encodeURIComponent(id)}/index-history`, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Ornn ${response.status}`);
      return parseHistory(await response.json(), id);
    })
    .catch((err) => {
      log.warn('ornn series', id, (err as Error).message);
      const entry = cache.get(id);
      if (entry) entry.expires = Date.now() + ERROR_TTL_MS;
      return null;
    });
  cache.set(id, { expires: Date.now() + TTL_MS, promise });
  return promise;
}

export function clearOrnnCache(): void {
  cache.clear();
}
