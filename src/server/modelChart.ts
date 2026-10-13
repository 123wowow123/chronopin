// The data behind the AI model pins' cost/quality chart: every text model's
// LMArena Elo joined to its price on OpenRouter. Both are public and keyless,
// and both are read on view with an hour's cache, never stored - a copied
// score is stale within a week (the PinSeries rule, ../lib/series).
//
//   Elo     the arena's "overall" text leaderboard, published as a HuggingFace
//           dataset. Rows come sorted with "overall" first, a hundred a page,
//           so paging stops at the first page that has another category in it.
//   price   OpenRouter's model list: prompt and completion dollars per token,
//           and `created`, which is the listing date and is the year the chart
//           segments on. :free / :batch variants are the same model at another
//           price and are skipped; a model priced at zero has no point on a
//           log axis and is skipped too.
//
// The two name a model differently ("claude-opus-4-6-high" against
// "anthropic/claude-opus-4.6"), so they are joined on modelKey(). A model the
// router does not list has a score but no price and is left out, not guessed.

import { modelRelease } from '@/lib/modelSeries';
import { blendedPrice, markFrontier, modelKey, type ModelChartData, type ModelPoint, type UnscoredModel } from '@/lib/modelChart';
import { pinPath } from '@/lib/seo';
import * as db from './db';
import log from './util/log';

const ARENA_URL = 'https://datasets-server.huggingface.co/rows?dataset=lmarena-ai/leaderboard-dataset&config=text&split=latest';
const ROUTER_URL = 'https://openrouter.ai/api/v1/models';
const PAGE = 100;
const MAX_PAGES = 8;
const TIMEOUT_MS = 20000;
const TTL_MS = 60 * 60 * 1000;
const ERROR_TTL_MS = 5 * 60 * 1000;
const PIN_INDEX_TTL_MS = 5 * 60 * 1000;
const UA = 'ChronoPin/1.0 (https://chronopin.com) model chart fetch';

type Arena = { name: string; organization: string | null; elo: number; publishedOn: string | null };
type Router = { name: string; price: number; year: number };
// `unscored`: priced on the router, absent from the arena's leaderboard.
export type ModelUniverse = { points: ModelPoint[]; publishedOn: string | null; unscored: UnscoredModel[] };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${new URL(url).host} answered ${response.status}`);
  return (await response.json()) as T;
}

async function readArena(): Promise<Map<string, Arena>> {
  const best = new Map<string, Arena>();
  for (let page = 0; page < MAX_PAGES; page++) {
    const body = await getJson<{ rows: { row: Record<string, unknown> }[] }>(`${ARENA_URL}&offset=${page * PAGE}&length=${PAGE}`);
    let overall = 0;
    for (const { row } of body.rows) {
      if (row.category !== 'overall') continue;
      overall++;
      const name = String(row.model_name ?? '');
      const elo = Number(row.rating);
      if (!name || !Number.isFinite(elo)) continue;
      const key = modelKey(name);
      // Several effort settings of one model: the best score is the model's.
      if (key && elo > (best.get(key)?.elo ?? -Infinity)) {
        best.set(key, {
          name,
          organization: typeof row.organization === 'string' ? row.organization : null,
          elo,
          publishedOn: typeof row.leaderboard_publish_date === 'string' ? row.leaderboard_publish_date : null,
        });
      }
    }
    if (overall < PAGE) break;
  }
  return best;
}

async function readRouter(): Promise<Map<string, Router>> {
  const body = await getJson<{ data: { id: string; name?: string; created?: number; pricing?: Record<string, string> }[] }>(ROUTER_URL);
  const out = new Map<string, Router>();
  for (const m of body.data) {
    if (/:(free|batch)$/.test(m.id)) continue;
    const prompt = Number(m.pricing?.prompt);
    const completion = Number(m.pricing?.completion);
    if (!(prompt > 0) || !(completion > 0) || !m.created) continue;
    const key = modelKey(m.id);
    const price = blendedPrice(prompt, completion);
    const year = new Date(m.created * 1000).getUTCFullYear();
    // One model listed by several providers or snapshots: the earliest listing
    // is its release year, the lowest price what it costs to run.
    const seen = out.get(key);
    // The router names a model "Anthropic: Claude Haiku 5.5"; the lab is a prefix.
    const name = (m.name ?? m.id).replace(/^[^:]+:\s*/, '') || m.id;
    out.set(key, seen ? { name: seen.name, price: Math.min(seen.price, price), year: Math.min(seen.year, year) } : { name, price, year });
  }
  return out;
}

export async function readModelUniverse(): Promise<ModelUniverse> {
  const [arena, router] = await Promise.all([readArena(), readRouter()]);
  const raw: ModelPoint[] = [];
  let publishedOn: string | null = null;
  for (const [key, a] of arena) {
    const r = router.get(key);
    if (!r) continue;
    raw.push({ key, name: a.name, organization: a.organization, elo: Math.round(a.elo), price: r.price, year: r.year });
    if (a.publishedOn && (!publishedOn || a.publishedOn > publishedOn)) publishedOn = a.publishedOn;
  }
  // The frontier is read within a year, which is how the chart is segmented.
  const byYear = new Map<number, ModelPoint[]>();
  for (const p of raw) byYear.set(p.year, [...(byYear.get(p.year) ?? []), p]);
  const points = [...byYear.values()].flatMap((group) => markFrontier(group));
  const unscored: UnscoredModel[] = [];
  for (const [key, r] of router) {
    if (!arena.has(key)) unscored.push({ key, name: r.name, organization: null, price: r.price, year: r.year });
  }
  return { points, publishedOn, unscored };
}

type Entry = { expires: number; promise: Promise<ModelUniverse | null> };
let cache: Entry | null = null;

// null when either source is down, so the page shows no chart rather than a
// half-joined one. A failure is remembered briefly so a dead host is not hit
// by every pin view.
export function cachedModelUniverse(): Promise<ModelUniverse | null> {
  if (cache && cache.expires > Date.now()) return cache.promise;
  const entry: Entry = {
    expires: Date.now() + TTL_MS,
    promise: readModelUniverse().then(
      (universe) => {
        if (!universe.points.length) entry.expires = Date.now() + ERROR_TTL_MS;
        return universe.points.length ? universe : null;
      },
      (err) => {
        entry.expires = Date.now() + ERROR_TTL_MS;
        log.error('modelChart', (err as Error)?.message);
        return null;
      },
    ),
  };
  cache = entry;
  return entry.promise;
}

// The model a pin is about, among the chart's points: the exact key, or the
// shortest key that continues it ("gemini 3.1 pro" -> "gemini 3.1 pro
// preview"), which is how a router names a model that the title does not.
export function findPinned(points: ModelPoint[], key: string): ModelPoint | null {
  const exact = points.find((p) => p.key === key);
  if (exact) return exact;
  const longer = points.filter((p) => p.key.startsWith(`${key} `)).sort((a, b) => a.key.length - b.key.length);
  return longer[0] ?? null;
}

// The pin that announced each model the site has one for. Of the AI Models
// pins naming a model, the earliest-starting - the release, not a later update
// to it. A pin names a model when the model's key appears in its title as a
// run of whole words ("deepseek v4.1 flash" in "DeepSeek-V4.1-Flash
// Released"; "claude opus 4" is not in "Claude Opus 4.5 Released"). Titles are
// read the way the arena's names are, so every vendor's models match, not only
// the families src/lib/modelSeries.ts knows to thread.
type ModelPin = { id: number; title: string; words: string[] };
export type ModelPinIndex = ModelPin[];

const wordsOf = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‐‑‒–—]/g, '-')
    .replace(/[^a-z0-9.+\- ]/g, ' ')
    // "Pro4" and "Pro 4", "Qwen3" and "Qwen 3" are one name; both sides are read this way.
    .replace(/([a-z])(\d)/g, '$1 $2')
    .split(/[-\s]+/)
    .filter(Boolean);

let pinIndex: { expires: number; promise: Promise<ModelPinIndex> } | null = null;

export function modelPinIndex(): Promise<ModelPinIndex> {
  if (pinIndex && pinIndex.expires > Date.now()) return pinIndex.promise;
  const promise = db
    .query<{ id: number; title: string }>(
      `SELECT p."id", p."title" FROM "Pin" p JOIN "PinTag" t ON t."pinId" = p."id"
       WHERE t."name" = 'AI Models' AND p."utcDeletedDateTime" IS NULL
       ORDER BY p."utcStartDateTime", p."id"`,
    )
    .then((rows) => rows.map((row) => ({ ...row, words: wordsOf(row.title) })))
    .catch((err) => {
      log.error('modelChart', (err as Error)?.message);
      return [] as ModelPinIndex;
    });
  // Short, unlike the sources: a pin posted a minute ago should get its dot.
  pinIndex = { expires: Date.now() + PIN_INDEX_TTL_MS, promise };
  return promise;
}

function hasRun(words: string[], run: string[]): boolean {
  if (!run.length) return false;
  for (let i = 0; i + run.length <= words.length; i++) {
    if (run.every((w, j) => words[i + j] === w)) return true;
  }
  return false;
}

// A parameter-count word: "27b", "70b", "270m", "1.5b".
const SIZE = /^\d+(?:\.\d+)?[bm]$/;

// A family launched in several sizes is one pin ("Llama 3.1 8B, 70B and 405B
// Released"), and a size is not next to the family name there. The model's key
// reads as the family run plus its size ("llama 3.1 70b"): it is in the title
// when the run is and the size is named anywhere after it.
function hasFamilySize(words: string[], run: string[]): boolean {
  const size = run[run.length - 1];
  if (run.length < 3 || !SIZE.test(size)) return false;
  const family = run.slice(0, -1);
  for (let i = 0; i + family.length <= words.length; i++) {
    if (family.every((w, j) => words[i + j] === w) && words.slice(i + family.length).includes(size)) return true;
  }
  return false;
}

// Words the arena puts on the end of a model's name that a release's own title
// does not ("gemma-3-4b-it", "llama-3.1-8b-instruct").
const NAME_TAIL = new Set(['it', 'instruct', 'chat', 'base', 'turbo']);

// The earliest pin whose title names the model; the pins are in start order.
// Tried as the key reads, then without its trailing instruct/it-style words.
// A pin that also names a longer chart key which continues this one is that
// model's pin, not this one's ("DeepSeek-V3.2-Exp Released" is the pin for
// "deepseek v3.2 exp", so "deepseek v3.2" goes to the pin after it), unless it
// is the only pin there is.
function pinFor(index: ModelPinIndex, key: string, keys: string[][]): ModelPin | undefined {
  const run = wordsOf(key);
  const named = (pin: ModelPin, words: string[]) => hasRun(pin.words, words) || hasFamilySize(pin.words, words);
  // Longer keys read the way the pins are matched: without their trailing
  // instruct/it words, so "mistral small 3.1 24b instruct" owns its pin.
  const longer = keys
    .filter((other) => other.length > run.length && run.every((w, i) => other[i] === w))
    .map((other) => {
      const words = [...other];
      while (words.length > run.length && NAME_TAIL.has(words[words.length - 1])) words.pop();
      return words;
    })
    .filter((words) => words.length > run.length);
  for (;;) {
    const matches = index.filter((pin) => named(pin, run));
    if (matches.length) {
      const own = matches.filter((pin) => !longer.some((words) => named(pin, words)));
      return (own.length ? own : matches)[0];
    }
    if (run.length < 2 || !NAME_TAIL.has(run[run.length - 1])) return undefined;
    run.pop();
  }
}

// Only the models the site has a pin for are drawn: a dot is a way into its pin,
// so a model without one is left out rather than shown as a dead end. The
// frontier was worked out over every model with a score and a price, so it is
// still the true one - a frontier model with no pin is a gap in the pins, not
// a reason to move the line. The pin being read is always drawn, with its own
// id, even when it is not in the AI Models index (a pin in the AI category).
export function buildModelChart(
  universe: ModelUniverse,
  pinnedKey: string | null,
  pins: ModelPinIndex = [],
  currentPinId?: number,
  currentTitle?: string,
): ModelChartData {
  // The pin's thread is its model line (modelSeries): every dot whose own pin
  // is on that line is flagged, so the chart can colour the thread's models.
  const lineOf = (title: string | undefined) => modelRelease(title)?.line;
  const threadLine = lineOf(currentTitle ?? pins.find((pin) => pin.id === currentPinId)?.title);
  const own = pinnedKey ? findPinned(universe.points, pinnedKey) : null;
  const keys = universe.points.map((p) => wordsOf(p.key));
  const points = universe.points
    .map((p) => {
      const pin = pinFor(pins, p.key, keys);
      const thread = threadLine != null && (p === own || (pin != null && lineOf(pin.title) === threadLine));
      if (p === own && currentPinId != null) return { ...p, pinId: currentPinId, href: pin ? pinPath(pin) : undefined, thread };
      return pin ? { ...p, pinId: pin.id, href: pinPath(pin), thread } : p;
    })
    .filter((p) => p.pinId != null);
  const pinned = own ? (points.find((p) => p.key === own.key) ?? null) : null;
  const years = [...new Set(points.map((p) => p.year))].sort((a, b) => b - a);
  return {
    points,
    years,
    pinned: pinned?.key ?? null,
    pinnedYear: pinned?.year ?? null,
    publishedOn: universe.publishedOn,
  };
}

// The pin's model when the router prices it and the arena has not scored it
// yet: the unscored model whose key the pin's title names as a run of whole
// words, the longest key winning ("claude haiku 5.5" in "Claude Haiku 5.5
// Released"). Null when the title names none.
export function unscoredFor(universe: ModelUniverse, title: string): UnscoredModel | null {
  const words = wordsOf(title);
  let best: UnscoredModel | null = null;
  for (const u of universe.unscored) {
    if (!hasRun(words, wordsOf(u.key))) continue;
    if (!best || u.key.length > best.key.length) best = u;
  }
  return best;
}

// The chart for a model that has a price but no score: the field as usual, no
// pinned dot, and the model's price carried in `unscored`.
export function buildUnscoredChart(universe: ModelUniverse, unscored: UnscoredModel, pins: ModelPinIndex, pinId: number, title: string): ModelChartData {
  const chart = buildModelChart(universe, null, pins, pinId, title);
  const years = chart.years.includes(unscored.year) ? chart.years : [unscored.year, ...chart.years].sort((a, b) => b - a);
  return { ...chart, years, pinnedYear: unscored.year, unscored };
}

// The frontier models a single pin is the pin of, judged against the arena and
// the price list as they are now: the pin's title is matched to the chart's
// models alone (a fresh pin is not in the cached pin index yet), and a model it
// names counts when nothing cheaper scored as high among its year's models.
// Empty when the pin names none, or when either source cannot be read.
export async function frontierModelsOf(pin: { id: number; title: string }): Promise<string[]> {
  const universe = await cachedModelUniverse();
  if (!universe) return [];
  const only: ModelPinIndex = [{ id: pin.id, title: pin.title, words: wordsOf(pin.title) }];
  return buildModelChart(universe, null, only)
    .points.filter((p) => p.frontier && p.pinId === pin.id)
    .map((p) => p.name);
}
