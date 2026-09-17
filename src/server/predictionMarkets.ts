// Live odds from the prediction markets a pin links to: Kalshi, Polymarket
// (polymarket.com) and Polymarket US (polymarket.us). While anyone has a pin
// open, its feed pushes the odds to every viewer over the live feed.
//
// Each exchange's live socket is the main feed (kalshiStream.ts and
// polymarketUsStream.ts with their API keys, polymarketStream.ts keyless):
// prices stream in as they change, and REST reads (signed where there is a
// key) only pick up new markets and closes, every STREAM_REFRESH_MS. A market
// no socket covers - no key, a socket down, or not subscribed yet - falls back
// to being re-read every REFRESH_MS through the keyless public APIs: Kalshi's
// trade API, Polymarket's Gamma API and Polymarket US's gateway. The feeds are
// in-process, so like the pin stream this holds for a single replica.

import type { MarketOdds, MarketOutcome, MarketRef, MarketTrend } from '@/lib/predictionMarkets';
import { kalshiChance, kalshiHeaders, kalshiStream } from './kalshiStream';
import type { MarketStream } from './marketSocket';
import { polymarketStream } from './polymarketStream';
import { polymarketUsHeaders, polymarketUsStream } from './polymarketUsStream';
import log from './util/log';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const POLYMARKET_API = 'https://gamma-api.polymarket.com';
const POLYMARKET_CLOB = 'https://clob.polymarket.com';
// Polymarket US's keyed API and its public gateway, with the same paths.
const POLYMARKET_US_API = 'https://api.polymarket.us/v1';
const POLYMARKET_US_GATEWAY = 'https://gateway.polymarket.us/v1';
const TIMEOUT_MS = 8000;
// Well inside a minute, so a slow or failed read still leaves a fresh push
// within one.
export const REFRESH_MS = 30_000;
// A market streaming its prices is re-read this often, for new markets,
// closes and settlements, which the sockets don't reliably send.
const STREAM_REFRESH_MS = 5 * 60_000;
// Streamed prices this close together go out as one push.
const PUSH_MS = 1000;
// Shorter than a refresh: the cache only spares the exchanges when several
// open pins cite the same market.
const TTL_MS = 20_000;
const CACHE_LIMIT = 500;

type Json = Record<string, any>;

const cache: Map<string, { promise: Promise<MarketOdds | null>; expires: number }> = ((globalThis as any).__chronopinMarketOdds ??= new Map());

class NotFound extends Error {}

function signedHeaders(url: string): Record<string, string> | null {
  const { pathname } = new URL(url);
  if (url.startsWith(KALSHI_API)) return kalshiHeaders('GET', pathname);
  if (url.startsWith(POLYMARKET_US_API)) return polymarketUsHeaders('GET', pathname);
  return null;
}

const warnedHosts = new Set<string>();

async function fetchJson(url: string, headers?: Record<string, string> | null): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) throw new NotFound(url);
  if (!res.ok) throw new Error(`GET ${url} failed with ${res.status}`);
  return res.json();
}

// A read, signed when there is a key for the exchange. One without a key, or
// that fails signed (other than not found), is read keyless: at keyless, the
// public host, when the keyed one needs a key.
async function getJson(url: string, keyless = url): Promise<any> {
  const headers = signedHeaders(url);
  if (headers) {
    try {
      return await fetchJson(url, headers);
    } catch (err) {
      if (err instanceof NotFound) throw err;
      const host = new URL(url).host;
      if (!warnedHosts.has(host)) log.warn(`Signed read from ${host} failed (${(err as Error).message}); reading keyless`);
      warnedHosts.add(host);
    }
  }
  return fetchJson(keyless);
}

function num(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function byChance(a: MarketOutcome, b: MarketOutcome) {
  return (b.probability ?? -1) - (a.probability ?? -1);
}

const KALSHI_OPEN = new Set(['active', 'open', 'initialized', 'unopened']);

async function kalshiEvent(ref: Extract<MarketRef, { source: 'Kalshi' }>): Promise<{ event: Json; markets: Json[] } | null> {
  if (ref.kind === 'series') {
    const data = await getJson(`${KALSHI_API}/events?series_ticker=${encodeURIComponent(ref.ticker)}&status=open&with_nested_markets=true&limit=1`);
    const event = data.events?.[0];
    return event ? { event, markets: event.markets ?? [] } : null;
  }
  try {
    const data = await getJson(`${KALSHI_API}/events/${encodeURIComponent(ref.ticker)}?with_nested_markets=true`);
    // Nested markets come inside the event, beside an empty top-level list.
    return { event: data.event, markets: data.event?.markets?.length ? data.event.markets : (data.markets ?? []) };
  } catch (err) {
    if (!(err instanceof NotFound)) throw err;
    // The last path segment can be one market's ticker rather than its event's.
    const { market } = await getJson(`${KALSHI_API}/markets/${encodeURIComponent(ref.ticker)}`);
    return market?.event_ticker ? kalshiEvent({ ...ref, ticker: market.event_ticker }) : null;
  }
}

async function kalshi(ref: Extract<MarketRef, { source: 'Kalshi' }>): Promise<MarketOdds | null> {
  // Taken before the read, so a tick that lands during it counts as newer.
  const fetchedAt = new Date().toISOString();
  const found = await kalshiEvent(ref);
  if (!found?.markets.length) return null;
  const { event, markets } = found;
  const closed = markets.every((m) => !KALSHI_OPEN.has(m.status));
  const closeTimes = markets.map((m) => m.close_time).filter(Boolean).sort();
  const live = markets.filter((m) => closed || KALSHI_OPEN.has(m.status));
  // An event of one market is a yes/no question: shown as its two sides, like
  // a Polymarket question.
  const yes = live.length === 1 ? kalshiChance(live[0]) : null;
  const series = event.series_ticker;
  const history = (m: Json, side = '') => (series && m.ticker ? `kalshi:${series}:${m.ticker}${side}` : undefined);
  const outcomes: MarketOutcome[] =
    live.length === 1
      ? [
          { label: 'Yes', probability: yes, history: history(live[0]) },
          { label: 'No', probability: yes == null ? null : 1 - yes, history: history(live[0], ':no') },
        ]
      : live.map((m) => ({ label: m.yes_sub_title || m.title, probability: kalshiChance(m), history: history(m) }));
  return {
    source: 'Kalshi',
    url: ref.url,
    title: [event.title, event.sub_title].filter(Boolean).join(' '),
    outcomes: outcomes.sort(byChance),
    closeTime: closeTimes[closeTimes.length - 1],
    closed,
    fetchedAt,
  };
}

function parseList(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(String(value ?? ''));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// A market's own outcomes (Yes/No, or two named sides) with their prices.
function polymarketOutcomes(market: Json): MarketOutcome[] {
  const prices = parseList(market.outcomePrices);
  // Each outcome trades as its own token, whose id names its price history.
  const tokens = parseList(market.clobTokenIds);
  return parseList(market.outcomes).map((label, i) => ({
    label: String(label),
    probability: num(prices[i]) ?? null,
    history: tokens[i] ? `polymarket:${tokens[i]}` : undefined,
  }));
}

async function polymarket(ref: Extract<MarketRef, { source: 'Polymarket' }>): Promise<MarketOdds | null> {
  const fetchedAt = new Date().toISOString();
  if (ref.kind === 'market') {
    const [market] = await getJson(`${POLYMARKET_API}/markets?slug=${encodeURIComponent(ref.slug)}`);
    if (!market) return null;
    return {
      source: 'Polymarket',
      url: ref.url,
      title: market.question,
      outcomes: polymarketOutcomes(market).sort(byChance),
      volume: num(market.volume),
      closeTime: market.endDate,
      closed: !!market.closed,
      fetchedAt,
    };
  }

  const [event] = await getJson(`${POLYMARKET_API}/events?slug=${encodeURIComponent(ref.slug)}`);
  const markets: Json[] = event?.markets ?? [];
  if (!markets.length) return null;
  const closed = !!event.closed;
  // One market is a plain question; several are one outcome each, priced by
  // their Yes side. An open event's settled sub-markets (a candidate who
  // dropped out) are left off.
  const outcomes =
    markets.length === 1
      ? polymarketOutcomes(markets[0])
      : markets
          .filter((m) => closed || !m.closed)
          .map((m) => {
            const yes = polymarketOutcomes(m).find((o) => o.label.toLowerCase() === 'yes');
            return { label: m.groupItemTitle || m.question, probability: yes?.probability ?? null, volume: num(m.volume), history: yes?.history };
          });
  return {
    source: 'Polymarket',
    url: ref.url,
    title: event.title,
    outcomes: outcomes.sort(byChance),
    volume: num(event.volume),
    closeTime: event.endDate,
    closed,
    fetchedAt,
  };
}

// A Polymarket US market's chance of its long side: what it settled at once
// closed, else its current price (the bid/ask midpoint the exchange shows).
async function polymarketUsChance(market: Json): Promise<number | null> {
  if (market.closed) return num(market.marketSides?.find((side: Json) => side.long)?.price) ?? null;
  const path = `/markets/${encodeURIComponent(market.slug)}/bbo`;
  const { marketData } = await getJson(`${POLYMARKET_US_API}${path}`, `${POLYMARKET_US_GATEWAY}${path}`);
  return num(marketData?.currentPx?.value) ?? null;
}

async function polymarketUs(ref: Extract<MarketRef, { source: 'Polymarket US' }>): Promise<MarketOdds | null> {
  const fetchedAt = new Date().toISOString();
  // Events are only on the public gateway.
  const { event } = await getJson(`${POLYMARKET_US_GATEWAY}/events/slug/${encodeURIComponent(ref.slug)}`);
  const markets: Json[] = event?.markets ?? [];
  if (!markets.length) return null;
  const closed = !!event.closed;
  // An open event's settled markets are left off, as on Polymarket.
  const live = markets.filter((m) => closed || !m.closed);
  const chances = await Promise.all(live.map(polymarketUsChance));
  // A market's price is its long side's; the short side is the rest.
  const history = (m: Json, side = '') => `polymarketus:${m.slug}${side}`;
  let outcomes: MarketOutcome[];
  if (live.length === 1) {
    // One market is a question (Yes/No) or a game (one team per side).
    const [market] = live;
    const [chance] = chances;
    const side = (long: boolean) => market.marketSides?.find((s: Json) => !!s.long === long)?.description;
    outcomes = [
      { label: side(true) || 'Yes', probability: chance, history: history(market) },
      { label: side(false) || 'No', probability: chance == null ? null : 1 - chance, history: history(market, ':short') },
    ];
  } else {
    outcomes = live.map((m, i) => ({ label: m.title || m.question, probability: chances[i], history: history(m) }));
  }
  return {
    source: 'Polymarket US',
    url: ref.url,
    title: event.title,
    outcomes: outcomes.sort(byChance),
    closeTime: event.endDate,
    closed,
    fetchedAt,
  };
}

function refKey(ref: MarketRef) {
  return ref.source === 'Kalshi' ? `k:${ref.kind}:${ref.ticker}` : ref.source === 'Polymarket' ? `p:${ref.kind}:${ref.slug}` : `u:${ref.slug}`;
}

// The odds a link points at, or null when the exchange has no such market.
// Rejects when the exchange cannot be reached.
export function oddsFor(ref: MarketRef): Promise<MarketOdds | null> {
  const key = refKey(ref);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.promise;

  const read = ref.source === 'Kalshi' ? kalshi(ref) : ref.source === 'Polymarket' ? polymarket(ref) : polymarketUs(ref);
  const promise = read.catch((err) => {
    if (err instanceof NotFound) return null;
    cache.delete(key);
    throw err;
  });
  if (cache.size >= CACHE_LIMIT) {
    for (const [k, v] of cache) if (v.expires <= now) cache.delete(k);
    if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!);
  }
  cache.set(key, { promise, expires: now + TTL_MS });
  return promise;
}

// --- Trends ----------------------------------------------------------------

const TREND_DAYS = 7;
// History moves by the hour; a trend is re-read at most this often.
const TREND_TTL_MS = 10 * 60_000;
const trends: Map<string, { promise: Promise<[number, number][]>; expires: number }> = ((globalThis as any).__chronopinMarketTrends ??= new Map());

// A Kalshi hour's price: its last trade, else the one before, else the midpoint
// of the book, as kalshiChance reads a market.
function candleChance(candle: Json): number | undefined {
  const price = num(candle.price?.close_dollars) ?? num(candle.price?.previous_dollars);
  if (price !== undefined) return price;
  const bid = num(candle.yes_bid?.close_dollars);
  const ask = num(candle.yes_ask?.close_dollars);
  return bid !== undefined && ask !== undefined ? (bid + ask) / 2 : undefined;
}

async function readHistory(history: string): Promise<[number, number][]> {
  const end = Math.floor(Date.now() / 1000);
  const start = end - TREND_DAYS * 86_400;
  const [source, ...id] = history.split(':');
  if (source === 'kalshi') {
    const [series, ticker, side] = id;
    const { candlesticks = [] } = await getJson(
      `${KALSHI_API}/series/${encodeURIComponent(series)}/markets/${encodeURIComponent(ticker)}/candlesticks?start_ts=${start}&end_ts=${end}&period_interval=60`,
    );
    return (candlesticks as Json[]).flatMap((candle) => {
      const chance = candleChance(candle);
      return chance === undefined ? [] : [[Number(candle.end_period_ts), side === 'no' ? 1 - chance : chance] as [number, number]];
    });
  }
  if (source === 'polymarket') {
    const { history: points = [] } = await getJson(`${POLYMARKET_CLOB}/prices-history?market=${encodeURIComponent(id[0])}&interval=1w&fidelity=60`);
    return (points as Json[]).flatMap((point) => (num(point.p) === undefined ? [] : [[Number(point.t), num(point.p)!] as [number, number]]));
  }
  if (source === 'polymarketus') {
    const [slug, side] = id;
    // A week comes only by the minute: kept to one point an hour.
    const { history: points = [] } = await getJson(`${POLYMARKET_US_GATEWAY}/price-history?symbol=${encodeURIComponent(slug)}&fixedInterval=INTERVAL_1W&fidelity=1`);
    let hour = -1;
    return (points as Json[]).flatMap((point) => {
      const t = Number(point.timestamp);
      const chance = num(side === 'short' ? point.shortPrice : point.longPrice);
      if (chance === undefined || Math.floor(t / 3600) === hour) return [];
      hour = Math.floor(t / 3600);
      return [[t, chance] as [number, number]];
    });
  }
  return [];
}

// The past week of a market's leading outcome, or null when it has no history.
// Rejects when the exchange cannot be reached.
export async function trendFor(ref: MarketRef): Promise<MarketTrend | null> {
  const odds = await oddsFor(ref);
  const leader = odds?.outcomes.find((outcome) => outcome.history);
  if (!odds || !leader?.history) return null;
  const now = Date.now();
  let hit = trends.get(leader.history);
  if (!hit || hit.expires <= now) {
    const promise = readHistory(leader.history).catch((err) => {
      trends.delete(leader.history!);
      throw err;
    });
    if (trends.size >= CACHE_LIMIT) trends.delete(trends.keys().next().value!);
    hit = { promise, expires: now + TREND_TTL_MS };
    trends.set(leader.history, hit);
  }
  const points = await hit.promise;
  return points.length > 1 ? { source: odds.source, title: odds.title, label: leader.label, points } : null;
}

type OddsListener = (odds: MarketOdds[]) => void;

// A market's last successful read, and when it was taken.
type Read = { odds: MarketOdds | null; at: number };

type Feed = {
  refs: MarketRef[];
  listeners: Set<OddsListener>;
  reads: Map<string, Read>;
  last?: MarketOdds[];
  timer?: ReturnType<typeof setInterval>;
  reading: boolean;
  // The markets the feed streams, as a key, and how to stop.
  watching: string;
  unwatch?: () => void;
  pushTimer?: ReturnType<typeof setTimeout>;
};

const feeds: Map<number, Feed> = ((globalThis as any).__chronopinOddsFeeds ??= new Map());

// The socket an outcome's price streams from, named by its history: the
// market's id there, and whether the outcome is that market's other side.
function streamOf(outcome: MarketOutcome): { stream: MarketStream; id: string; flip: boolean } | null {
  const [source, ...id] = outcome.history?.split(':') ?? [];
  if (source === 'kalshi' && id[1]) return { stream: kalshiStream, id: id[1], flip: id[2] === 'no' };
  if (source === 'polymarket' && id[0]) return { stream: polymarketStream, id: id[0], flip: false };
  if (source === 'polymarketus' && id[0]) return { stream: polymarketUsStream, id: id[0], flip: id[1] === 'short' };
  return null;
}

const STREAMS = [kalshiStream, polymarketStream, polymarketUsStream];

// The open markets whose prices odds shows, by socket.
function streamable(odds: MarketOdds | null | undefined) {
  if (!odds || odds.closed) return [];
  return odds.outcomes.flatMap((outcome) => streamOf(outcome) ?? []);
}

// Every refresh re-reads a market unless its sockets have covered all its
// open markets since before its last read; then only every STREAM_REFRESH_MS.
// (Half a refresh of slack, so timer jitter doesn't skip one.)
function due(read: Read | undefined, now: number): boolean {
  if (!read) return true;
  const streamed = streamable(read.odds);
  const streaming = streamed.length > 0 && streamed.every(({ stream, id }) => (stream.coveredSince(id) ?? Infinity) <= read.at);
  return !streaming || now - read.at >= STREAM_REFRESH_MS - REFRESH_MS / 2;
}

// Odds with each market's price from a quote newer than the read.
function withQuotes(odds: MarketOdds): MarketOdds {
  if (odds.closed) return odds;
  const readAt = Date.parse(odds.fetchedAt);
  let latest = readAt;
  const outcomes = odds.outcomes.map((outcome) => {
    const streamed = streamOf(outcome);
    const quote = streamed?.stream.quote(streamed.id);
    if (!streamed || !quote || quote.at <= readAt) return outcome;
    latest = Math.max(latest, quote.at);
    return { ...outcome, probability: streamed.flip ? 1 - quote.chance : quote.chance };
  });
  return latest === readAt ? odds : { ...odds, outcomes: outcomes.sort(byChance), fetchedAt: new Date(latest).toISOString() };
}

// What viewers should see: each market's last read, with streamed prices.
function current(feed: Feed): MarketOdds[] {
  return feed.refs.flatMap((ref) => {
    const odds = feed.reads.get(refKey(ref))?.odds;
    return odds ? [withQuotes(odds)] : [];
  });
}

function push(feed: Feed, odds: MarketOdds[]) {
  feed.last = odds;
  feed.listeners.forEach((listener) => listener(odds));
}

// A streamed price is pushed a moment later, with any that follow it, and only
// when it changed what viewers see.
function schedulePush(pinId: number, feed: Feed) {
  feed.pushTimer ??= setTimeout(() => {
    feed.pushTimer = undefined;
    // A read under way pushes the price with it.
    if (feeds.get(pinId) !== feed || feed.reading) return;
    const odds = current(feed);
    const shown = (list?: MarketOdds[]) => JSON.stringify(list, (key, value) => (key === 'fetchedAt' ? undefined : value));
    if (shown(odds) !== shown(feed.last)) push(feed, odds);
  }, PUSH_MS);
}

// Streams the feed's open markets, following them as reads change.
function watch(pinId: number, feed: Feed) {
  const ids = STREAMS.map((stream) => [
    ...new Set(feed.refs.flatMap((ref) => streamable(feed.reads.get(refKey(ref))?.odds).flatMap((s) => (s.stream === stream ? [s.id] : [])))),
  ].sort());
  const key = JSON.stringify(ids);
  if (key === feed.watching) return;
  const previous = feed.unwatch;
  feed.watching = key;
  // The new set first, so markets in both stay subscribed.
  const stops = STREAMS.map((stream, i) => stream.watch(ids[i], () => schedulePush(pinId, feed)));
  feed.unwatch = () => stops.forEach((stop) => stop());
  previous?.();
}

// Re-reads the markets that are due and pushes the odds. A market whose read
// fails keeps its last one; a refresh where every read failed pushes nothing,
// unless nothing has been pushed yet: then an empty list, so a card stops
// holding room for odds that aren't coming.
async function refresh(pinId: number, feed: Feed) {
  if (feed.reading) return;
  feed.reading = true;
  try {
    const now = Date.now();
    const keys = new Set(feed.refs.map(refKey));
    for (const key of feed.reads.keys()) if (!keys.has(key)) feed.reads.delete(key);
    const stale = feed.refs.filter((ref) => due(feed.reads.get(refKey(ref)), now));
    const results = await Promise.allSettled(stale.map(oddsFor));
    if (feeds.get(pinId) !== feed) return;
    results.forEach((r, i) => {
      if (r.status === 'rejected') log.error('pin odds', (r.reason as Error)?.message);
      else feed.reads.set(refKey(stale[i]), { odds: r.value, at: r.value ? Date.parse(r.value.fetchedAt) : now });
    });
    if (feed.last && stale.length && results.every((r) => r.status === 'rejected')) return;
    watch(pinId, feed);
    push(feed, current(feed));
  } finally {
    feed.reading = false;
  }
}

// Follows a pin's odds: the latest straight away (or once first read), then
// each refresh and streamed change. The feed stops when its last viewer leaves.
export function subscribeOdds(pinId: number, refs: MarketRef[], listener: OddsListener): () => void {
  let feed = feeds.get(pinId);
  if (!feed) {
    feed = { refs, listeners: new Set(), reads: new Map(), reading: false, watching: '' };
    feeds.set(pinId, feed);
    const started = feed;
    started.timer = setInterval(() => void refresh(pinId, started), REFRESH_MS);
    void refresh(pinId, started);
  } else {
    // The newest viewer's page has the pin's current references.
    feed.refs = refs;
    if (feed.last) listener(feed.last);
  }
  feed.listeners.add(listener);

  const joined = feed;
  return () => {
    joined.listeners.delete(listener);
    if (!joined.listeners.size) {
      clearInterval(joined.timer);
      clearTimeout(joined.pushTimer);
      joined.unwatch?.();
      if (feeds.get(pinId) === joined) feeds.delete(pinId);
    }
  };
}
