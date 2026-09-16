// Live odds from the prediction markets a pin links to, through each
// exchange's public read-only API (no key): Kalshi's trade API and
// Polymarket's Gamma API. While anyone has a pin open, its feed re-reads the
// markets every REFRESH_MS and pushes the odds to every viewer (GET
// /api/pins/:id/odds/stream). The feeds are in-process, so like the pin
// stream this holds for a single replica.

import type { MarketOdds, MarketOutcome, MarketRef } from '@/lib/predictionMarkets';
import log from './util/log';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const POLYMARKET_API = 'https://gamma-api.polymarket.com';
const TIMEOUT_MS = 8000;
// Well inside a minute, so a slow or failed read still leaves a fresh push
// within one.
export const REFRESH_MS = 30_000;
// Shorter than a refresh: the cache only spares the exchanges when several
// open pins cite the same market.
const TTL_MS = 20_000;
const CACHE_LIMIT = 500;

type Json = Record<string, any>;

const cache: Map<string, { promise: Promise<MarketOdds | null>; expires: number }> = ((globalThis as any).__chronopinMarketOdds ??= new Map());

class NotFound extends Error {}

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (res.status === 404) throw new NotFound(url);
  if (!res.ok) throw new Error(`GET ${url} failed with ${res.status}`);
  return res.json();
}

function num(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

function byChance(a: MarketOutcome, b: MarketOutcome) {
  return (b.probability ?? -1) - (a.probability ?? -1);
}

// Kalshi quotes in dollars per $1 contract, so a price is the chance. The last
// trade is what kalshi.com shows; the bid/ask midpoint stands in before one.
function kalshiChance(market: Json): number | null {
  if (market.result === 'yes') return 1;
  if (market.result === 'no') return 0;
  const last = num(market.last_price_dollars) ?? (num(market.last_price) ?? NaN) / 100;
  if (last > 0) return last;
  const bid = num(market.yes_bid_dollars) ?? (num(market.yes_bid) ?? NaN) / 100;
  const ask = num(market.yes_ask_dollars) ?? (num(market.yes_ask) ?? NaN) / 100;
  return bid > 0 && ask > 0 ? (bid + ask) / 2 : null;
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
  const found = await kalshiEvent(ref);
  if (!found?.markets.length) return null;
  const { event, markets } = found;
  const closed = markets.every((m) => !KALSHI_OPEN.has(m.status));
  const closeTimes = markets.map((m) => m.close_time).filter(Boolean).sort();
  return {
    source: 'Kalshi',
    url: ref.url,
    title: [event.title, event.sub_title].filter(Boolean).join(' '),
    outcomes: markets
      .filter((m) => closed || KALSHI_OPEN.has(m.status))
      .map((m) => ({ label: m.yes_sub_title || m.title, probability: kalshiChance(m) }))
      .sort(byChance),
    closeTime: closeTimes[closeTimes.length - 1],
    closed,
    fetchedAt: new Date().toISOString(),
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
  return parseList(market.outcomes).map((label, i) => ({ label: String(label), probability: num(prices[i]) ?? null }));
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
            return { label: m.groupItemTitle || m.question, probability: yes?.probability ?? null, volume: num(m.volume) };
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

// The odds a link points at, or null when the exchange has no such market.
// Rejects when the exchange cannot be reached.
export function oddsFor(ref: MarketRef): Promise<MarketOdds | null> {
  const key = ref.source === 'Kalshi' ? `k:${ref.kind}:${ref.ticker}` : `p:${ref.kind}:${ref.slug}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expires > now) return hit.promise;

  const promise = (ref.source === 'Kalshi' ? kalshi(ref) : polymarket(ref)).catch((err) => {
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

type OddsListener = (odds: MarketOdds[]) => void;

type Feed = {
  refs: MarketRef[];
  listeners: Set<OddsListener>;
  last?: MarketOdds[];
  timer?: ReturnType<typeof setInterval>;
  reading: boolean;
};

const feeds: Map<number, Feed> = ((globalThis as any).__chronopinOddsFeeds ??= new Map());

// Reads every market the pin cites and pushes what answered. A read where
// every exchange failed pushes nothing, so viewers keep the last odds.
async function refresh(pinId: number, feed: Feed) {
  if (feed.reading) return;
  feed.reading = true;
  try {
    const results = await Promise.allSettled(feed.refs.map(oddsFor));
    results.forEach((r) => r.status === 'rejected' && log.error('pin odds', (r.reason as Error)?.message));
    if (results.every((r) => r.status === 'rejected')) return;
    const odds = results.flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []));
    if (feeds.get(pinId) !== feed) return;
    feed.last = odds;
    feed.listeners.forEach((listener) => listener(odds));
  } finally {
    feed.reading = false;
  }
}

// Follows a pin's odds: the latest straight away (or once first read), then
// each refresh. The feed stops reading when its last viewer leaves.
export function subscribeOdds(pinId: number, refs: MarketRef[], listener: OddsListener): () => void {
  let feed = feeds.get(pinId);
  if (!feed) {
    feed = { refs, listeners: new Set(), reading: false };
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
      if (feeds.get(pinId) === joined) feeds.delete(pinId);
    }
  };
}
