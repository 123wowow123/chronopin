// What the prediction markets are betting on this week, as pin candidates:
// Kalshi and Polymarket events that resolve in the next few days, and events
// newly listed since the last run, biggest books first. Read by the daily
// jobs' prediction_markets tool (./tools.ts) for the predictionMarkets task
// (docs/okf/scraping/daily-jobs.md#predictionmarkets). Keyless public APIs,
// the same ones the pin page's odds fall back to (../predictionMarkets.ts).
//
// Most of what resolves in a week is not an event worth a pin: single games
// and their props, crypto and index price ladders, daily temperatures, tweet
// counts, app downloads. A series with several events closing in the window
// is one of those by its shape, and the rest are named below, so what is left
// is short enough for a run to read.

import { parseMarketUrl, marketRefKey, type MarketOutcome } from '@/lib/predictionMarkets';
import * as db from '../db';
import { kalshiVolume, oddsFor } from '../predictionMarkets';
import log from '../util/log';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const POLYMARKET_API = 'https://gamma-api.polymarket.com';
const TIMEOUT_MS = 15_000;
// A week of closing Kalshi markets is about 43 pages of 1000 (2026-10-01),
// nearly all sport; the cap only stops a runaway listing.
const KALSHI_MAX_PAGES = 80;
// Kalshi's keyless limit is about 20 reads a second; this stays well under.
const KALSHI_PAGE_GAP_MS = 150;
// A series with this many events closing in the window is a recurring one:
// per-game markets and their props, daily numbers.
const RECURRING_EVENTS = 3;

// Kalshi series that recur with one or two events a week: price ladders,
// weather readings, counts of posts and actions, weekly rankings, app
// downloads (…APP), foot traffic (…FT), store and search share (…POS,
// …SHARE, …CC), and a game's props (…TOTAL, …SPREAD), whose game is listed
// on its own.
const KALSHI_NOISE =
  /^KX(BTC|ETH|DOGE|SOL|XRP|SHIBA|INX|NASDAQ|USDJPY|EURUSD|WTI|BRENT|GOLD|SILVER|HIGH|LOW|RAIN|SNOW|TEMP|AAAGAS|TRUTHSOCIAL|TWEETS|MENTION|TRUMPSAY|TRUMPACT|LLM\d|YTVIEWS|ALBUMEQUIV|ALBUMSTREAMS|SPOTIFY|TOPSONG|TOPALBUM|NETFLIXRANK|APPRANK)|(APP|(?<!DRA)FT|POS|SHARE|CC|WEEKLY|TOTAL|SPREAD|BTTS|1H|TD)$/;

// Polymarket tags its own recurring and per-game events.
const POLYMARKET_NOISE_TAGS = new Set([
  'games', 'esports', 'recurring', 'daily', 'weekly', 'up-or-down', 'crypto-prices', 'hit-price',
  'multi-strikes', 'hide-from-new', 'tweets-markets', 'daily-temperature', 'weather', 'views', 'mention-markets',
]);

// Tags too broad to say two events are one story.
const BROAD_TAGS = new Set([
  'politics', 'elections', 'world', 'global-elections', 'world-elections', 'main-election', 'macro-election-2',
  'international-election-props', 'finance', 'economy', 'business', 'pop-culture', 'culture', 'sports', 'geopolitics', 'tech',
]);

// Polymarket lists unpriced placeholders for candidates not yet named.
const PLACEHOLDER = /^(candidate|person|party|player|team|other) [a-z]$/i;

type Json = Record<string, any>;

export type MarketCandidate = {
  exchange: 'Kalshi' | 'Polymarket';
  url: string;
  title: string;
  // Kalshi's series ticker or Polymarket's tags: what kind of market it is.
  kind: string;
  // When the market resolves - for a "by when" market, the deadline, not the
  // event's date.
  closes: string | null;
  // When it was listed.
  listed: string | null;
  // Listed since the last run (or the last day).
  isNew: boolean;
  // Dollars traded, all time and over the last day where the exchange says.
  volume: number;
  volume24h: number | null;
  odds: { label: string; chance: number | null }[];
  // A pin already citing this market, by its source or a reference.
  coveredByPin: number | null;
  // Smaller markets on the same story, folded into this one: an election's
  // races and props resolve together and are one pin, or a thread of them.
  related?: string[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function getJson(url: string): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 429 && attempt < 4) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`GET ${url} failed with ${res.status}`);
    return res.json();
  }
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'market';
const chance = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null;
};

// Every pin's market links, by market key, so a candidate a pin already cites
// says which pin. Kalshi links to a whole series cover its events too.
async function pinnedMarkets(): Promise<Map<string, number>> {
  const rows = await db.query<{ id: number; url: string }>(
    `SELECT "p"."id", "p"."sourceUrl" AS "url" FROM "Pin" AS "p"
     WHERE "p"."utcDeletedDateTime" IS NULL AND "p"."sourceUrl" ~* '(kalshi\\.com|polymarket\\.(com|us))/'
     UNION ALL
     SELECT "p"."id", "r"."url" FROM "PinReference" AS "r" JOIN "Pin" AS "p" ON "p"."id" = "r"."pinId" AND "p"."utcDeletedDateTime" IS NULL
     WHERE "r"."url" ~* '(kalshi\\.com|polymarket\\.(com|us))/'`,
  );
  const byKey = new Map<string, number>();
  for (const row of rows) {
    const ref = parseMarketUrl(row.url);
    if (ref && !byKey.has(marketRefKey(ref))) byKey.set(marketRefKey(ref), row.id);
  }
  return byKey;
}

// --- Kalshi -------------------------------------------------------------------

type KalshiEvent = { ticker: string; series: string; markets: number; volume: number; volume24h: number; closes: string; listed: string };

// Open markets matching `query`, summed into their events.
async function kalshiEvents(query: string): Promise<KalshiEvent[]> {
  const events = new Map<string, KalshiEvent>();
  let cursor = '';
  for (let page = 0; page < KALSHI_MAX_PAGES; page++) {
    const data = await getJson(`${KALSHI_API}/markets?status=open&limit=1000&mve_filter=exclude&${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    for (const m of (data.markets ?? []) as Json[]) {
      const ticker = String(m.event_ticker ?? '');
      if (!ticker) continue;
      const e = events.get(ticker) ?? { ticker, series: ticker.split('-')[0], markets: 0, volume: 0, volume24h: 0, closes: m.close_time, listed: m.open_time ?? m.created_time };
      e.markets += 1;
      e.volume += kalshiVolume(m) ?? 0;
      const price = Number(m.last_price_dollars);
      e.volume24h += (Number(m.volume_24h_fp) || 0) * (Number.isFinite(price) ? price : 0);
      if (m.close_time > e.closes) e.closes = m.close_time;
      const listed = m.open_time ?? m.created_time;
      if (listed && listed < e.listed) e.listed = listed;
      events.set(ticker, e);
    }
    cursor = data.cursor;
    if (!cursor) break;
    await sleep(KALSHI_PAGE_GAP_MS);
  }
  return [...events.values()];
}

// The events worth a look: not a recurring series, not on the noise list.
export function kalshiShortlist(events: KalshiEvent[]): KalshiEvent[] {
  const perSeries = new Map<string, number>();
  for (const e of events) perSeries.set(e.series, (perSeries.get(e.series) ?? 0) + 1);
  return events.filter((e) => (perSeries.get(e.series) ?? 0) < RECURRING_EVENTS && !KALSHI_NOISE.test(e.series));
}

async function kalshiCandidate(e: KalshiEvent, since: Date, pinned: Map<string, number>): Promise<MarketCandidate | null> {
  const odds = await oddsFor({ source: 'Kalshi', kind: 'event', ticker: e.ticker, url: '' }).catch(() => null);
  if (!odds) return null;
  return {
    exchange: 'Kalshi',
    url: `https://kalshi.com/markets/${e.series.toLowerCase()}/${slugify(odds.title)}/${e.ticker.toLowerCase()}`,
    title: odds.title,
    kind: e.series,
    closes: odds.closeTime ?? e.closes,
    listed: e.listed,
    isNew: !!e.listed && new Date(e.listed) >= since,
    volume: Math.round(odds.volume ?? e.volume),
    volume24h: Math.round(e.volume24h),
    odds: odds.outcomes.slice(0, 4).map((o: MarketOutcome) => ({ label: o.label, chance: chance(o.probability) })),
    coveredByPin: pinned.get(`k:${e.ticker}`) ?? pinned.get(`k:${e.series}`) ?? null,
  };
}

// --- Polymarket ---------------------------------------------------------------

function polymarketOdds(event: Json): { label: string; chance: number | null }[] {
  const markets = ((event.markets ?? []) as Json[]).filter((m) => !m.closed);
  const yes = (m: Json) => {
    try {
      return chance(JSON.parse(m.outcomePrices ?? '[]')[0]);
    } catch {
      return null;
    }
  };
  if (markets.length === 1) return [{ label: 'Yes', chance: yes(markets[0]) }];
  return markets
    .map((m) => ({ label: String(m.groupItemTitle || m.question || ''), chance: yes(m) }))
    .filter((o) => !PLACEHOLDER.test(o.label))
    .sort((a, b) => (b.chance ?? -1) - (a.chance ?? -1))
    .slice(0, 4);
}

function polymarketCandidate(event: Json, since: Date, pinned: Map<string, number>): MarketCandidate {
  const tags = ((event.tags ?? []) as Json[]).map((t) => String(t.slug ?? '')).filter(Boolean);
  const listed = event.startDate ?? event.createdAt ?? null;
  const covered = [`p:${event.slug}`, ...((event.markets ?? []) as Json[]).map((m) => `p:${m.slug}`)].map((k) => pinned.get(k)).find((id) => id);
  return {
    exchange: 'Polymarket',
    url: `https://polymarket.com/event/${event.slug}`,
    title: String(event.title ?? event.slug),
    kind: tags.slice(0, 5).join(', '),
    closes: event.endDate ?? null,
    listed,
    isNew: !!listed && new Date(listed) >= since,
    volume: Math.round(Number(event.volume) || 0),
    volume24h: Math.round(Number(event.volume24hr) || 0),
    odds: polymarketOdds(event),
    coveredByPin: covered ?? null,
  };
}

// Events that share a specific tag (brazil, quebec) and resolve within two
// days of each other are one story; each folds into the biggest of them.
// `events` comes biggest first.
const STORY_MS = 2 * 86_400_000;

export function foldStories(events: Json[]): { event: Json; related: string[] }[] {
  type Story = { event: Json; related: string[]; ends: number };
  const kept: Story[] = [];
  const byTag = new Map<string, Story[]>();
  for (const event of events) {
    const ends = new Date(event.endDate).getTime();
    const tags = ((event.tags ?? []) as Json[]).map((t) => String(t.slug ?? '')).filter((t) => t && !BROAD_TAGS.has(t));
    const story = tags.flatMap((t) => byTag.get(t) ?? []).find((s) => Math.abs(s.ends - ends) <= STORY_MS);
    if (story) {
      story.related.push(String(event.title ?? event.slug));
      continue;
    }
    const entry: Story = { event, related: [], ends };
    kept.push(entry);
    for (const t of tags) byTag.set(t, [...(byTag.get(t) ?? []), entry]);
  }
  return kept.map(({ event, related }) => ({ event, related }));
}

const polymarketNoise = (event: Json) => ((event.tags ?? []) as Json[]).some((t) => POLYMARKET_NOISE_TAGS.has(String(t.slug)));

async function polymarketEvents(query: string): Promise<Json[]> {
  const events: Json[] = [];
  for (let offset = 0; offset < 500; offset += 100) {
    const page = (await getJson(`${POLYMARKET_API}/events?active=true&closed=false&order=volume&ascending=false&limit=100&offset=${offset}&${query}`)) as Json[];
    events.push(...page);
    if (page.length < 100) break;
  }
  return events;
}

// --- Both ---------------------------------------------------------------------

export type MarketScan = {
  window: { from: string; to: string; newSince: string };
  read: { kalshiEvents: number; polymarketEvents: number };
  // Resolving in the window, biggest book first.
  thisWeek: MarketCandidate[];
  // Listed since newSince and resolving later, biggest book first.
  newlyListed: MarketCandidate[];
  problems: string[];
};

export async function marketCandidates({ days = 7, since = null as Date | null, limit = 30, minVolume = 10_000 } = {}): Promise<MarketScan> {
  const now = new Date();
  const to = new Date(now.getTime() + days * 86_400_000);
  // "New" means since the last run, and at least the last day.
  const newSince = new Date(Math.min(since?.getTime() ?? Infinity, now.getTime() - 86_400_000));
  const pinned = await pinnedMarkets();
  const problems: string[] = [];
  const nowS = Math.floor(now.getTime() / 1000);

  const [kalshiWeek, kalshiNew] = await Promise.all([
    kalshiEvents(`min_close_ts=${nowS}&max_close_ts=${Math.floor(to.getTime() / 1000)}`).catch((err) => {
      problems.push(`Kalshi week: ${(err as Error).message}`);
      return [] as KalshiEvent[];
    }),
    // Kalshi will not filter on created and close times together.
    kalshiEvents(`min_created_ts=${Math.floor(newSince.getTime() / 1000)}`).then(
      (events) => events.filter((e) => e.closes > to.toISOString()),
      (err) => {
        problems.push(`Kalshi new: ${(err as Error).message}`);
        return [] as KalshiEvent[];
      },
    ),
  ]);
  const [polyWeek, polyNew] = await Promise.all([
    polymarketEvents(`end_date_min=${now.toISOString()}&end_date_max=${to.toISOString()}`).catch((err) => {
      problems.push(`Polymarket week: ${(err as Error).message}`);
      return [] as Json[];
    }),
    polymarketEvents(`start_date_min=${newSince.toISOString()}&end_date_min=${to.toISOString()}`).catch((err) => {
      problems.push(`Polymarket new: ${(err as Error).message}`);
      return [] as Json[];
    }),
  ]);

  // Kalshi's titles and odds cost a read each, so only the biggest few are read.
  const kalshiTop = async (events: KalshiEvent[]) => {
    const out: MarketCandidate[] = [];
    for (const e of kalshiShortlist(events).filter((e) => e.volume >= minVolume).sort((a, b) => b.volume - a.volume).slice(0, limit)) {
      const c = await kalshiCandidate(e, newSince, pinned);
      if (c) out.push(c);
      await sleep(KALSHI_PAGE_GAP_MS);
    }
    return out;
  };
  const polyTop = (events: Json[]) =>
    foldStories(events.filter((e) => !polymarketNoise(e) && Number(e.volume) >= minVolume).sort((a, b) => Number(b.volume) - Number(a.volume))).map(
      ({ event, related }) => ({ ...polymarketCandidate(event, newSince, pinned), ...(related.length ? { related: related.slice(0, 12) } : {}) }),
    );

  const rank = (list: MarketCandidate[]) => list.sort((a, b) => b.volume - a.volume).slice(0, limit);
  const thisWeek = rank([...(await kalshiTop(kalshiWeek)), ...polyTop(polyWeek)]);
  const seen = new Set(thisWeek.map((c) => c.url));
  const newlyListed = rank([...(await kalshiTop(kalshiNew)), ...polyTop(polyNew)].filter((c) => !seen.has(c.url)));
  if (problems.length) log.warn(`prediction markets scan: ${problems.join('; ')}`);
  return {
    window: { from: now.toISOString(), to: to.toISOString(), newSince: newSince.toISOString() },
    read: { kalshiEvents: kalshiWeek.length + kalshiNew.length, polymarketEvents: polyWeek.length + polyNew.length },
    thisWeek,
    newlyListed,
    problems,
  };
}
