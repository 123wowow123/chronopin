// Ornn Compute Price Index (https://data.ornn.com/home/h100): the daily rental
// price of each GPU model in USD per GPU-hour. Ornn's public API only serves
// the latest three months, so each refresh is merged into the days already
// stored and the panel's history keeps growing past that window. Stored as
// snapshot lines on one IndustryForecast row; called by refresh_ornn_gpu_prices
// (docs/okf/scraping/daily-jobs.md#industryforecasts).

import * as db from '../db';
import type { ForecastLine } from '@/lib/industryForecast';
import { saveForecastSnapshot } from '../model/industryForecast';
import { getOrnnSeries } from '../ornnSeries';
import { industryForecastRequest } from './pinApi';

export const ORNN_ROW = 'ornn-gpu-rental-price';
// Ornn's names, and how the panel labels them, newest hardware first.
// The third is the GPU's launch pin (the legend links to it): NVIDIA launch pins by @ChipDesk.
export const ORNN_GPUS: [string, string, number?][] = [
  ['B300', 'B300', 20952],
  ['B200', 'B200', 20951],
  ['H200', 'H200', 21455],
  ['H100 SXM', 'H100', 20950],
  ['A100 SXM4', 'A100', 21454],
  ['RTX PRO 6000 WS', 'RTX PRO 6000', 21457],
  ['RTX 5090', 'RTX 5090', 21456],
];

// Fresh readings win over stored ones for the same day; older stored days stay.
export function mergePoints(stored: { x: string; value: number }[], fresh: { x: string; value: number }[]): { x: string; value: number }[] {
  const byDay = new Map(stored.map((p) => [p.x, p.value]));
  for (const p of fresh) byDay.set(p.x, p.value);
  return [...byDay].map(([x, value]) => ({ x, value })).sort((a, b) => (a.x < b.x ? -1 : 1));
}

export async function refreshOrnnGpuPrices(): Promise<{ through: string; days: number; production: boolean }> {
  const rows = await db.query<{ snapshot: ForecastLine[] }>(`SELECT "snapshot" FROM "IndustryForecast" WHERE "slug" = $1`, [ORNN_ROW]);
  if (!rows.length) throw new Error(`No ${ORNN_ROW} row; run npm run industry:forecasts`);
  const stored = new Map(rows[0].snapshot.map((l) => [l.label, l.points]));

  const lines: ForecastLine[] = [];
  for (const [name, label, pinId] of ORNN_GPUS) {
    const link = pinId ? { pinId } : {};
    const series = await getOrnnSeries(name);
    if (!series) {
      // Keep what is stored for a GPU Ornn did not answer for, rather than dropping its line.
      if (stored.get(label)?.length) lines.push({ label, ...link, points: stored.get(label)! });
      continue;
    }
    lines.push({ label, ...link, points: mergePoints(stored.get(label) ?? [], series.points.map((p) => ({ x: p.day, value: p.value }))) });
  }
  if (!lines.some((l) => l.points.length >= 2)) throw new Error('Ornn returned no GPU price history');

  if (!(await saveForecastSnapshot(ORNN_ROW, lines))) throw new Error(`No ${ORNN_ROW} row; run npm run industry:forecasts`);
  const production = await industryForecastRequest({ slug: ORNN_ROW, snapshot: lines }).then(() => true, () => false);
  const first = lines[0].points;
  return { through: first.at(-1)!.x, days: first.length, production };
}
