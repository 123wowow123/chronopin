// A series from Epoch AI's data-center tracker: one campus's modelled IT power,
// compute or capital cost at each dated satellite reading, projections
// included. The timeline CSV is public and keyless, and every campus is a set
// of rows in the one file, so the whole file is fetched once and shared.
//
// The handle is "<campus slug>:<metric>" ("meta-los-lunas:it"); only that is
// stored (PinSeries, 0241). The readings are irregular (a few per campus, some
// in the future), so the chart is told they are monthly: the dates read "Oct
// 2026", which is the precision Epoch's observations have.

import log from './util/log';
import type { SeriesPoint } from './eiaSeries';

const CSV_URL = 'https://epoch.ai/data/data_centers/data_center_timelines.csv';
const PAGE_URL = 'https://epoch.ai/data/ai-data-centers/directory';
const TIMEOUT_MS = 20000;
// Epoch revises the file when it re-reads imagery, a few times a week at most.
const TTL_MS = 6 * 60 * 60 * 1000;
const ERROR_TTL_MS = 5 * 60 * 1000;
const UA = 'ChronoPin/1.0 (https://chronopin.com) series fetch';

const METRICS = {
  it: { column: 'IT power (MW)', label: 'IT power', units: 'MW' },
  h100e: { column: 'H100 equivalents', label: 'AI compute', units: 'H100e' },
  cost: { column: 'Total capital cost (2025 USD billions)', label: 'Capital cost', units: '2025 USD bn' },
} as const;
type Metric = keyof typeof METRICS;

export type EpochSeries = {
  seriesId: string;
  title: string | null;
  units: string | null;
  frequency: 'weekly' | 'monthly';
  releaseDate: string | null;
  nextReleaseDate: string | null;
  sourceUrl: string;
  points: SeriesPoint[];
};

export const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// "meta-los-lunas:it" -> { slug, metric }; null for anything else, so nothing
// else is ever matched against the file.
export function parseEpochId(seriesId: string): { slug: string; metric: Metric } | null {
  const m = /^([a-z0-9][a-z0-9-]{0,60}):([a-z0-9]+)$/.exec(seriesId.trim().toLowerCase());
  return m && m[2] in METRICS ? { slug: m[1], metric: m[2] as Metric } : null;
}

export const epochUrl = (seriesId: string): string => `${PAGE_URL}/${parseEpochId(seriesId)?.slug ?? encodeURIComponent(seriesId)}`;

// RFC 4180 reader: Epoch's status notes are quoted and run over lines.
export function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// One campus's readings for one metric, oldest first. A reading with no value
// is skipped, not read as zero (water use is often blank).
export function parseTimeline(csv: string, seriesId: string): EpochSeries | null {
  const parsed = parseEpochId(seriesId);
  if (!parsed) return null;
  const [header, ...rows] = parseRows(csv);
  const nameAt = header.indexOf('Data center');
  const dateAt = header.indexOf('Date');
  const valueAt = header.indexOf(METRICS[parsed.metric].column);
  if (nameAt < 0 || dateAt < 0 || valueAt < 0) throw new Error('Epoch timeline columns changed');
  const mine = rows.filter((r) => slugify(r[nameAt] ?? '') === parsed.slug);
  if (!mine.length) return null;
  const points: SeriesPoint[] = [];
  for (const r of mine) {
    const day = (r[dateAt] ?? '').trim();
    const raw = (r[valueAt] ?? '').trim();
    const value = Number(raw);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day) && raw !== '' && Number.isFinite(value)) points.push({ day, value });
  }
  points.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
  const metric = METRICS[parsed.metric];
  return {
    seriesId,
    title: `${mine[0][nameAt]}: ${metric.label} (Epoch AI estimate, projections included)`,
    units: metric.units,
    frequency: 'monthly',
    releaseDate: null,
    nextReleaseDate: null,
    sourceUrl: epochUrl(seriesId),
    points,
  };
}

let file: { expires: number; promise: Promise<string> } | null = null;

function timelineCsv(): Promise<string> {
  if (file && file.expires > Date.now()) return file.promise;
  const promise = fetch(CSV_URL, { headers: { 'User-Agent': UA, Accept: 'text/csv' }, signal: AbortSignal.timeout(TIMEOUT_MS) }).then(async (response) => {
    if (!response.ok) throw new Error(`Epoch ${response.status}`);
    return response.text();
  });
  const entry = { expires: Date.now() + TTL_MS, promise };
  file = entry;
  promise.catch(() => { entry.expires = Date.now() + ERROR_TTL_MS; });
  return promise;
}

export async function getEpochSeries(seriesId: string): Promise<EpochSeries | null> {
  try {
    const series = parseTimeline(await timelineCsv(), seriesId.trim().toLowerCase());
    if (!series?.points.length) throw new Error(`no readings for ${seriesId}`);
    return series;
  } catch (err) {
    log.warn('epoch series', seriesId, (err as Error).message);
    return null;
  }
}

export function clearEpochCache(): void {
  file = null;
}
