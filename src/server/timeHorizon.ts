// The data behind the time-horizon chart on AI model pins: METR's public,
// keyless benchmark_results YAML (the file behind metr.org/time-horizons), read
// on view with an hour's cache and never stored. The pin's model is found by
// its title, the longest model name that appears in it as a run of whole words.

import yaml from 'js-yaml';
import type { HorizonChartData, HorizonPoint, HorizonValue } from '@/lib/timeHorizon';
import { pinPath } from '@/lib/seo';
import { hasRun, pinFor, wordsOf, type ModelPinIndex } from './modelChart';
import log from './util/log';

const YAML_URL = 'https://metr.org/assets/benchmark_results_1_1.yaml';
const TIMEOUT_MS = 20000;
const TTL_MS = 60 * 60 * 1000;
const ERROR_TTL_MS = 5 * 60 * 1000;
const UA = 'ChronoPin/1.0 (https://chronopin.com) time horizon fetch';

type Metric = { estimate?: number; ci_low?: number; ci_high?: number };
type Entry = {
  release_date?: string | Date;
  metrics?: { p50_horizon_length?: Metric; p80_horizon_length?: Metric };
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// "claude_3_5_sonnet_20240620_inspect" -> "Claude 3.5 Sonnet".
export function metrName(slug: string): string {
  let s = slug
    .replace(/_inspect$/, '')
    .replace(/_\d{4}_\d{2}_\d{2}/, '')
    .replace(/_\d{8}$/, '')
    .replace(/^gpt(\d)/, 'gpt_$1')
    .replace(/_/g, ' ');
  // Claude 4 and later put the tier first: "claude 4 1 opus" -> "Claude Opus 4.1".
  s = s.replace(/^claude (\d)(?: (\d))? (opus|sonnet|haiku)$/, (_m, major: string, minor: string | undefined, tier: string) =>
    Number(major) >= 4 ? `claude ${tier} ${major}${minor ? `.${minor}` : ''}` : _m,
  );
  s = s.replace(/\b(\d) (\d)\b/g, '$1.$2').replace(/\bmythos preview early$/, 'mythos preview (early)');
  return s
    .split(' ')
    .map((word) => {
      if (word === 'gpt') return 'GPT';
      if (/^o\d/.test(word) || word.startsWith('(')) return word;
      if (word === 'davinci') return 'Davinci';
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .replace(/^GPT (\d)/, 'GPT-$1')
    .replace(/^Davinci 002$/, 'Davinci-002')
    .replace(/^GPT-2$/, 'GPT-2');
}

const value = (m: Metric | undefined): HorizonValue | null =>
  m?.estimate != null && Number.isFinite(m.estimate) && m.estimate > 0
    ? { minutes: m.estimate, low: m.ci_low ?? null, high: m.ci_high ?? null }
    : null;

export function parseHorizons(text: string): HorizonPoint[] {
  const doc = yaml.load(text) as { results?: Record<string, Entry> } | null;
  if (!doc?.results) throw new Error('METR time horizon file changed');
  const rows = Object.entries(doc.results).flatMap(([slug, entry]) => {
    const raw = entry.release_date;
    const date = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw ?? '');
    const p50 = value(entry.metrics?.p50_horizon_length);
    const p80 = value(entry.metrics?.p80_horizon_length);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || (!p50 && !p80)) return [];
    return [{ slug, name: metrName(slug), date, p50, p80 }];
  });
  // Two releases of one name (the June and October 3.5 Sonnets) tell apart by month.
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.name, (counts.get(r.name) ?? 0) + 1);
  return rows
    .map((r) => ({
      key: r.name.toLowerCase() + ((counts.get(r.name) ?? 0) > 1 ? ` ${r.date}` : ''),
      name: (counts.get(r.name) ?? 0) > 1 ? `${r.name} (${MONTHS[Number(r.date.slice(5, 7)) - 1]} ${r.date.slice(0, 4)})` : r.name,
      date: r.date,
      p50: r.p50,
      p80: r.p80,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

let cache: { expires: number; promise: Promise<HorizonPoint[] | null> } | null = null;

export function cachedHorizons(): Promise<HorizonPoint[] | null> {
  if (cache && cache.expires > Date.now()) return cache.promise;
  const entry = {
    expires: Date.now() + TTL_MS,
    promise: fetch(YAML_URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) })
      .then(async (response) => {
        if (!response.ok) throw new Error(`METR ${response.status}`);
        return parseHorizons(await response.text());
      })
      .catch((err) => {
        entry.expires = Date.now() + ERROR_TTL_MS;
        log.error('timeHorizon', (err as Error)?.message);
        return null;
      }),
  };
  cache = entry;
  return entry.promise;
}

// null when the pin names no model METR has measured.
export function buildHorizonChart(points: HorizonPoint[], title: string, pins: ModelPinIndex = [], currentPinId?: number): HorizonChartData | null {
  const words = wordsOf(title);
  let own: HorizonPoint | null = null;
  for (const p of points) {
    // The base key of a disambiguated pair ("claude 3.5 sonnet 2024-06-20") is its model name.
    const run = wordsOf(p.key.replace(/ \d{4}-\d{2}-\d{2}$/, ''));
    if (hasRun(words, run) && (!own || p.key.length > own.key.length || (p.key.length === own.key.length && p.date > own.date))) own = p;
  }
  if (!own) return null;
  const keys = points.map((p) => wordsOf(p.key));
  const linked = points.map((p) => {
    if (p.key === own.key) return { ...p, pinId: currentPinId };
    const pin = pinFor(pins, p.key.replace(/ \d{4}-\d{2}-\d{2}$/, ''), keys);
    return pin ? { ...p, pinId: pin.id, href: pinPath(pin) } : p;
  });
  return { points: linked, pinned: own.key };
}
