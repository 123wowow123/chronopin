// Nasdaq's public quote API (keyless; the website's own backend): delayed
// quotes, daily closes, the last session's intraday chart and symbol search,
// for US listings. The terms of use have not been checked for an ad-supported
// site, like the market odds' (see predictionMarkets.ts).
//
// Live quotes follow the market odds' shape: one feed per symbol, re-read on a
// timer while anyone watches, pushed to every watcher (src/server/liveFeed.ts).

import { isCompanyListing, nasdaqChartInstant, nasdaqDay, nasdaqNumber, type AssetClass, type DailyClose, type StockQuote } from '@/lib/stocks';
import log from './util/log';

const API = 'https://api.nasdaq.com/api';
// It answers a browser, not a bare client.
const HEADERS = {
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  accept: 'application/json, text/plain, */*',
};
const TIMEOUT_MS = 10_000;

async function get<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
  if (!res.ok) throw new Error(`nasdaq ${res.status} for ${path}`);
  const body = (await res.json()) as { data: T | null };
  return body.data ?? null;
}

const q = (symbol: string) => encodeURIComponent(symbol.toLowerCase());

// Closes and charts are shared by every pin of a company posted or starting
// around the same days: a backfill asks for each once.
const CACHE_MS = 10 * 60_000;
const cache = ((globalThis as any).__chronopinStockCache ??= new Map<string, { at: number; value: Promise<unknown> }>()) as Map<string, { at: number; value: Promise<unknown> }>;

function cached<T>(key: string, read: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value as Promise<T>;
  const value = read();
  cache.set(key, { at: Date.now(), value });
  // A failure is not kept.
  value.catch(() => cache.get(key)?.value === value && cache.delete(key));
  if (cache.size > 2000) cache.delete(cache.keys().next().value!);
  return value;
}

type Info = {
  symbol: string;
  companyName: string;
  stockType: string;
  marketStatus?: string;
  primaryData?: { lastSalePrice: string; netChange: string; percentageChange: string; lastTradeTimestamp: string };
};

type ChartQuote = { symbol: string; company: string; lastSalePrice: string; netChange: string; percentageChange: string; timeAsOf: string };

// The delayed quote, or null for a symbol Nasdaq does not know as this class.
// Its quote endpoint sometimes fails one symbol for hours ("Error while
// calling vendor", seen for SONY) while the chart endpoint, which carries the
// same last sale and day's change, still answers: that stands in.
export async function fetchQuote(symbol: string, assetClass: AssetClass): Promise<(StockQuote & { name: string }) | null> {
  const info = await get<Info>(`/quote/${q(symbol)}/info?assetclass=${assetClass}`);
  const price = nasdaqNumber(info?.primaryData?.lastSalePrice);
  if (!info || price == null) {
    const chart = await get<ChartQuote>(`/quote/${q(symbol)}/chart?assetclass=${assetClass}`).catch(() => null);
    const last = nasdaqNumber(chart?.lastSalePrice);
    if (!chart || last == null) return null;
    return {
      symbol: chart.symbol.toUpperCase(),
      name: chart.company.trim().replace(/\s+(Common Stock|Class [A-C] Common Stock|Ordinary Shares)$/i, ''),
      price: last,
      change: nasdaqNumber(chart.netChange),
      changePercent: nasdaqNumber(chart.percentageChange),
      marketStatus: null,
      asOf: chart.timeAsOf || null,
      fetchedAt: new Date().toISOString(),
    };
  }
  return {
    symbol: info.symbol.toUpperCase(),
    name: info.companyName.replace(/\s+(Common Stock|Class [A-C] Common Stock|Ordinary Shares)$/i, ''),
    price,
    change: nasdaqNumber(info.primaryData!.netChange),
    changePercent: nasdaqNumber(info.primaryData!.percentageChange),
    marketStatus: info.marketStatus ?? null,
    asOf: info.primaryData!.lastTradeTimestamp || null,
    fetchedAt: new Date().toISOString(),
  };
}

// A symbol as a stock, else as an ETF: which class it is, and its quote.
export async function identify(symbol: string): Promise<{ assetClass: AssetClass; quote: StockQuote & { name: string } } | null> {
  for (const assetClass of ['stocks', 'etf'] as const) {
    const quote = await fetchQuote(symbol, assetClass).catch(() => null);
    if (quote) return { assetClass, quote };
  }
  return null;
}

// Every daily close Nasdaq has for the symbol: the last 10 years, split-
// adjusted. Asked as one range up to today, because a range that ends in the
// past comes back empty (seen for 2022 and for 2023 with 2026 still in reach).
export function fetchCloses(symbol: string, assetClass: AssetClass): Promise<DailyClose[]> {
  return cached(`closes|${symbol}`, () => readCloses(symbol, assetClass));
}

const HISTORY_YEARS = 10;

async function readCloses(symbol: string, assetClass: AssetClass): Promise<DailyClose[]> {
  const today = new Date();
  const from = new Date(Date.UTC(today.getUTCFullYear() - HISTORY_YEARS, today.getUTCMonth(), today.getUTCDate())).toISOString().slice(0, 10);
  const data = await get<{ tradesTable: { rows: { date: string; close: string }[] | null } }>(
    `/quote/${q(symbol)}/historical?assetclass=${assetClass}&fromdate=${from}&todate=${today.toISOString().slice(0, 10)}&limit=9999`,
  );
  return (data?.tradesTable.rows ?? []).flatMap((row) => {
    const day = nasdaqDay(row.date);
    const close = nasdaqNumber(row.close);
    return day && close != null ? [{ day, close }] : [];
  });
}

// The last session's minute prices (pre-market included), as instants.
export function fetchIntraday(symbol: string, assetClass: AssetClass): Promise<{ at: Date; price: number }[]> {
  return cached(`chart|${symbol}`, () => readIntraday(symbol, assetClass));
}

async function readIntraday(symbol: string, assetClass: AssetClass): Promise<{ at: Date; price: number }[]> {
  const data = await get<{ chart: { x: number; y: number }[] | null }>(`/quote/${q(symbol)}/chart?assetclass=${assetClass}`);
  return (data?.chart ?? []).filter((p) => Number.isFinite(p.y)).map((p) => ({ at: nasdaqChartInstant(p.x), price: p.y }));
}

// A company's own US stock by its name, or null (private, listed elsewhere,
// or no hit that is plainly the company).
export async function lookupCompanyTicker(company: string): Promise<{ symbol: string; name: string } | null> {
  const hits = await get<{ symbol: string; name: string; asset: string }[]>(`/autocomplete/slookup/10?search=${encodeURIComponent(company)}`);
  const hit = (hits ?? []).find((h) => isCompanyListing(company, h));
  return hit ? { symbol: hit.symbol.toUpperCase(), name: hit.name } : null;
}

/* Live quotes */

// Delayed quotes move at most once a minute; out of hours, hardly at all.
const OPEN_REFRESH_MS = 60_000;
const CLOSED_REFRESH_MS = 10 * 60_000;

type QuoteListener = (quote: StockQuote) => void;
type Feed = { assetClass: AssetClass; listeners: Set<QuoteListener>; last?: StockQuote; timer?: ReturnType<typeof setTimeout> };

// On globalThis so dev reloads share one set of feeds.
const feeds = ((globalThis as any).__chronopinStockFeeds ??= new Map<string, Feed>()) as Map<string, Feed>;

async function refresh(symbol: string, feed: Feed) {
  let open = true;
  try {
    const quote = await fetchQuote(symbol, feed.assetClass);
    if (quote && feeds.get(symbol) === feed) {
      const { name: _name, ...pushed } = quote;
      feed.last = pushed;
      open = !/closed/i.test(quote.marketStatus ?? '');
      feed.listeners.forEach((listener) => listener(pushed));
    }
  } catch (err) {
    log.warn(`stock quote ${symbol} failed:`, (err as Error).message);
  }
  if (feeds.get(symbol) === feed && feed.listeners.size) {
    feed.timer = setTimeout(() => void refresh(symbol, feed), open ? OPEN_REFRESH_MS : CLOSED_REFRESH_MS);
  }
}

// Follows a symbol's quote until the returned function is called; a watcher
// joining a running feed gets its last quote at once.
export function subscribeQuote(symbol: string, assetClass: AssetClass, listener: QuoteListener): () => void {
  let feed = feeds.get(symbol);
  if (!feed) {
    feed = { assetClass, listeners: new Set() };
    feeds.set(symbol, feed);
    feed.listeners.add(listener);
    void refresh(symbol, feed);
  } else {
    feed.listeners.add(listener);
    if (feed.last) listener(feed.last);
  }
  const joined = feed;
  return () => {
    joined.listeners.delete(listener);
    if (!joined.listeners.size) {
      clearTimeout(joined.timer);
      if (feeds.get(symbol) === joined) feeds.delete(symbol);
    }
  };
}
