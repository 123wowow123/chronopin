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
import { adminDbRequest, industryForecastRequest, prodBase } from './pinApi';

export const ORNN_ROW = 'ornn-gpu-rental-price';
// Ornn's names, how the panel labels them, and the sourceUrl of the GPU's NVIDIA
// launch pin (the legend links to it). Pins are found by sourceUrl in each
// environment, because a pin has a different id here and on production.
const NV = 'https://nvidianews.nvidia.com/news/';
const NVGEFORCE = NV + 'nvidia-blackwell-geforce-rtx-50-series-opens-new-world-of-ai-computer-graphics';
export const ORNN_GPUS: [name: string, label: string, launchPin?: string][] = [
  ['B300', 'B300', NV + 'nvidia-blackwell-ultra-ai-factory-platform-paves-way-for-age-of-ai-reasoning'],
  ['B200', 'B200', NV + 'nvidia-blackwell-platform-arrives-to-power-a-new-era-of-computing'],
  ['H200', 'H200', NV + 'nvidia-supercharges-hopper-the-worlds-leading-ai-computing-platform'],
  ['H100 SXM', 'H100', NV + 'nvidia-announces-hopper-architecture-the-next-generation-of-accelerated-computing'],
  ['A100 SXM4', 'A100', NV + 'nvidias-new-ampere-data-center-gpu-in-full-production'],
  ['RTX PRO 6000 WS', 'RTX PRO 6000', NV + 'nvidia-blackwell-rtx-pro-workstations-servers-agentic-ai'],
  ['RTX 5090', 'RTX 5090', NVGEFORCE],
];

// The launch pins' ids here, and on production when the run writes there.
async function launchPinIds(): Promise<{ local: Map<string, number>; prod: Map<string, number> }> {
  const urls = ORNN_GPUS.map((g) => g[2]).filter((u): u is string => !!u);
  const local = new Map<string, number>();
  for (const r of await db.query<{ id: number; sourceUrl: string }>(`SELECT "id", "sourceUrl" FROM "Pin" WHERE "sourceUrl" = ANY($1) AND "utcDeletedDateTime" IS NULL ORDER BY "id"`, [urls])) local.set(r.sourceUrl, r.id);
  const prod = new Map<string, number>();
  if (prodBase()) {
    for (const url of urls) {
      try {
        const { rows } = await adminDbRequest<{ rows: { id: number; utcDeletedDateTime?: string | null }[] }>('GET', `/api/admin/db/Pin?sourceUrl=${encodeURIComponent(url)}`);
        const live = rows?.find((r) => !r.utcDeletedDateTime);
        if (live) prod.set(url, live.id);
      } catch {
        // A pin production cannot be asked about is left unlinked there, not guessed.
      }
    }
  }
  return { local, prod };
}

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
  const ids = await launchPinIds();

  const points = new Map<string, { x: string; value: number }[]>();
  for (const [name, label] of ORNN_GPUS) {
    const series = await getOrnnSeries(name);
    // Keep what is stored for a GPU Ornn did not answer for, rather than dropping its line.
    const merged = series ? mergePoints(stored.get(label) ?? [], series.points.map((p) => ({ x: p.day, value: p.value }))) : (stored.get(label) ?? []);
    if (merged.length) points.set(label, merged);
  }
  if (![...points.values()].some((p) => p.length >= 2)) throw new Error('Ornn returned no GPU price history');
  // The same points, each line linked to its launch pin as that environment knows it.
  const lines = (pinIds: Map<string, number>): ForecastLine[] =>
    ORNN_GPUS.filter(([, label]) => points.has(label)).map(([, label, url]) => {
      const pinId = url ? pinIds.get(url) : undefined;
      return { label, ...(pinId ? { pinId } : {}), points: points.get(label)! };
    });

  const here = lines(ids.local);
  if (!(await saveForecastSnapshot(ORNN_ROW, here))) throw new Error(`No ${ORNN_ROW} row; run npm run industry:forecasts`);
  const production = await industryForecastRequest({ slug: ORNN_ROW, snapshot: lines(ids.prod) }).then(() => true, () => false);
  const first = here[0].points;
  return { through: first.at(-1)!.x, days: first.length, production };
}
