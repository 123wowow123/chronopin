// Ramp AI Index "Tokenomics" (https://ramp.com/data/ai-index?metric=token-volume):
// weekly token volume, token spend and blended price per million tokens across
// the businesses on Ramp, read from the page's own chart-data feeds and stored
// as snapshot lines on three IndustryForecast rows. Called by refresh_ramp_tokens
// (docs/okf/scraping/daily-jobs.md#industryforecasts).

import type { ForecastLine } from '@/lib/industryForecast';
import { saveForecastSnapshot } from '../model/industryForecast';
import { industryForecastRequest } from './pinApi';

const BASE = 'https://ramp.com/data/ai-index/chart-data';
export const RAMP_TOKEN_ROWS = { volume: 'ramp-token-volume', spend: 'ramp-token-spend', price: 'ramp-token-price' } as const;

type Usage = { period_end: string; metric_key: string; model_maker: string; metric_value: number | null };
type Price = { usage_date: string; token_type: string; model_maker: string; token_cost_usd_7d: number | null; token_count_7d: number | null };

const MAKERS: [string, string][] = [['anthropic', 'Anthropic'], ['openai', 'OpenAI'], ['google', 'Google']];
const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

async function feed<T>(name: string): Promise<T[]> {
  const res = await fetch(`${BASE}/${name}`, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ChronoPin job)' }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Ramp ${name} answered ${res.status}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) throw new Error(`Ramp ${name} returned no rows`);
  return rows as T[];
}

// Weekly totals per maker for one metric, scaled to the unit the row shows.
export function usageLines(rows: Usage[], metric: 'token_volume' | 'token_spend', scale: number, digits: number): ForecastLine[] {
  const weeks = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (r.metric_key !== metric || r.metric_value == null) continue;
    const w = weeks.get(r.period_end) ?? new Map<string, number>();
    w.set(r.model_maker, (w.get(r.model_maker) ?? 0) + r.metric_value);
    weeks.set(r.period_end, w);
  }
  const days = [...weeks.keys()].sort();
  const line = (label: string, pick: (w: Map<string, number>) => number): ForecastLine => ({ label, points: days.map((x) => ({ x, value: round(pick(weeks.get(x)!) / scale, digits) })) });
  return [line('All makers on Ramp', (w) => [...w.values()].reduce((a, b) => a + b, 0)), ...MAKERS.map(([k, label]) => line(label, (w) => w.get(k) ?? 0))];
}

// Price per million tokens on the weeks' last days (Sundays), as Ramp draws it.
export function priceLines(rows: Price[]): ForecastLine[] {
  const weeks = new Map<string, Map<string, { cost: number; tokens: number }>>();
  for (const r of rows) {
    if (r.token_type !== 'all_tokens' || !r.token_cost_usd_7d || !r.token_count_7d || r.token_count_7d <= 0) continue;
    if (new Date(`${r.usage_date}T00:00:00Z`).getUTCDay() !== 0) continue;
    const w = weeks.get(r.usage_date) ?? new Map();
    w.set(r.model_maker, { cost: r.token_cost_usd_7d, tokens: r.token_count_7d });
    weeks.set(r.usage_date, w);
  }
  const days = [...weeks.keys()].sort();
  const per = (c: number, t: number) => round((c * 1e6) / t, 3);
  return [
    { label: 'OpenAI and Anthropic, blended', points: days.map((x) => { const v = [...weeks.get(x)!.values()]; return { x, value: per(v.reduce((a, b) => a + b.cost, 0), v.reduce((a, b) => a + b.tokens, 0)) }; }) },
    ...MAKERS.slice(0, 2).map(([k, label]) => ({ label, points: days.filter((x) => weeks.get(x)!.has(k)).map((x) => { const v = weeks.get(x)!.get(k)!; return { x, value: per(v.cost, v.tokens) }; }) })),
  ];
}

// Fetches the feeds and replaces the three rows' lines here and, when the run
// writes to production, there. Throws if a row is missing (npm run industry:forecasts).
export async function refreshRampTokens(): Promise<{ through: string; weeks: number; production: boolean }> {
  const [usage, prices] = await Promise.all([feed<Usage>('tokenVolumes'), feed<Price>('tokenPrices')]);
  const sets: [string, ForecastLine[]][] = [
    [RAMP_TOKEN_ROWS.volume, usageLines(usage, 'token_volume', 1e12, 2)],
    [RAMP_TOKEN_ROWS.spend, usageLines(usage, 'token_spend', 1e6, 2)],
    [RAMP_TOKEN_ROWS.price, priceLines(prices)],
  ];
  let production = true;
  for (const [slug, lines] of sets) {
    if (lines.some((l) => l.points.length < 2)) throw new Error(`Ramp feed for ${slug} no longer has a weekly series`);
    if (!(await saveForecastSnapshot(slug, lines))) throw new Error(`No ${slug} row; run npm run industry:forecasts`);
    production = (await industryForecastRequest({ slug, snapshot: lines }).then(() => true, () => false)) && production;
  }
  const first = sets[0][1][0].points;
  return { through: first.at(-1)!.x, weeks: first.length, production };
}
