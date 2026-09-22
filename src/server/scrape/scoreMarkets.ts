/**
 * Review scores from Kalshi's markets on them: Rotten Tomatoes' Tomatometer
 * for films and shows, Metacritic's Metascore for games.
 *
 * Each title is one Kalshi event, a ladder of "Above N" markets settled
 * against the site's score on a set day. While it trades, the ladder prices
 * P(score > N), which gives a market-implied score - kept as its own rating
 * ("Kalshi RT forecast"), never as the site's. Once it settles, the event's
 * expiration_value is the site's actual score on settlement day.
 *
 * Kalshi files every title as an event of one series per site (KXRT,
 * KXMC), with the work's name as the event's sub_title. The per-title series
 * it used before ("Kinds of Kindness Rotten Tomatoes score", 2024-25) are
 * not looked at: their settled events no longer return any markets, and
 * walking ~300 of them trips Kalshi's keyless rate limit.
 *
 * Keyless public API, like the pin page's odds (../predictionMarkets.ts).
 * Nothing here throws: a failed or unmatched lookup is just no score.
 */

import { categoryList, hasCategory } from '@/lib/categories';
import { siteUrl } from '@/lib/appConfig';
import type { PinRatingJson } from '@/lib/types';
import log from '../util/log';
import { isScreenCategory, normalizeTitle, titleCandidates, yearFits, type ScreenQuery } from './screen';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const REQUEST_TIMEOUT_MS = 8000;
const DEFAULT_BUDGET_MS = 20000;
const EVENTS_TTL_MS = 10 * 60 * 1000;
const USER_AGENT = `ChronopinBot/1.0 (+${siteUrl})`;

export type ScoreSite = 'Rotten Tomatoes' | 'Metacritic';

// slug: the series title's slug in kalshi.com's links to it.
const SITES: Record<ScoreSite, { series: string; slug: string; forecast: string; host: RegExp }> = {
  'Rotten Tomatoes': { series: 'KXRT', slug: 'rotten-tomatoes-scores', forecast: 'Kalshi RT forecast', host: /rottentomatoes\.com/i },
  Metacritic: {
    series: 'KXMC',
    slug: 'what-will-be-the-metacritic-score-for-movie',
    forecast: 'Kalshi Metacritic forecast',
    host: /metacritic\.com/i,
  },
};

export const GAME_CATEGORIES = ['Gaming'];

// Which site's score a pin's category is bet on, if any.
// One category or a pin's list of them.
export function scoreSiteFor(categories: string | readonly (string | null | undefined)[] | null | undefined): ScoreSite | undefined {
  if (isScreenCategory(categories)) return 'Rotten Tomatoes';
  if (hasCategory(categoryList(categories), GAME_CATEGORIES)) return 'Metacritic';
  return undefined;
}

export function isForecastSource(source: string) {
  return Object.values(SITES).some((s) => s.forecast === source);
}

export type ScoreMarket = {
  site: ScoreSite;
  eventTicker: string;
  // The work as Kalshi names it.
  title: string;
  // The event's page on kalshi.com.
  url: string;
  // The work's page on the review site, from the event's settlement source.
  siteUrl?: string;
  settled: boolean;
  // The settled score, or the market-implied one, out of 100.
  score: number;
  closeTime?: string;
};

// The rating a market gives a pin: the site's own score once settled, else
// Kalshi's forecast of it.
export function scoreRating(market: ScoreMarket): PinRatingJson {
  return market.settled
    ? { source: market.site, score: market.score, scoreMax: 100, url: market.siteUrl ?? market.url }
    : { source: SITES[market.site].forecast, score: market.score, scoreMax: 100, url: market.url };
}

// A market's rating added to ratings found elsewhere, unless they already
// have the site's own score (from Wikidata, which may be newer than a
// settlement, and makes a forecast moot).
export function withScoreMarket(ratings: PinRatingJson[], market: ScoreMarket | undefined): PinRatingJson[] {
  if (!market || ratings.some((r) => r.source === market.site)) return ratings;
  return [...ratings, scoreRating(market)];
}

export async function findScoreMarket(
  query: Pick<ScreenQuery, 'workTitle' | 'pinTitle' | 'category' | 'year'>,
  budgetMs = DEFAULT_BUDGET_MS,
): Promise<ScoreMarket | undefined> {
  const site = scoreSiteFor(query.category);
  const titles = titleCandidates(query).map((t) => normalizeTitle(t, { keepThe: true }));
  if (!site || !titles.length) return undefined;
  const signal = AbortSignal.timeout(budgetMs);

  // Kalshi sometimes lists a title twice (KXMC-FIN and KXMC-FINA).
  const tickers = (await siteEvents(site, signal))
    .filter((e) => titles.includes(normalizeTitle(e.sub_title ?? '', { keepThe: true })))
    .map((e) => e.event_ticker as string);

  const found: ScoreMarket[] = [];
  for (const ticker of tickers) {
    const res = await getJson<{ event?: Json }>(`${KALSHI_API}/events/${encodeURIComponent(ticker)}?with_nested_markets=true`, signal);
    const market = res?.event ? readScoreEvent(res.event, site) : undefined;
    if (market && scoreYearFits(market, query.year, site)) found.push(market);
  }
  // The latest, when a title was bet on more than once.
  return found.sort((a, b) => (b.closeTime ?? '').localeCompare(a.closeTime ?? ''))[0];
}

/* Reading an event */

type Json = Record<string, any>;

// An event's score, settled or implied, or undefined when it is not a
// score ladder or has no usable prices.
export function readScoreEvent(event: Json, site: ScoreSite): ScoreMarket | undefined {
  const markets: Json[] = (event.markets ?? []).filter((m: Json) => /^greater/.test(m.strike_type ?? '') && Number.isFinite(Number(m.floor_strike)));
  if (!markets.length) return undefined;
  const sourceUrl: string | undefined = (event.settlement_sources ?? []).map((s: Json) => s.url).find((u: string) => SITES[site].host.test(u ?? ''));
  const settled = markets.every((m) => m.result === 'yes' || m.result === 'no');
  const score = settled ? settledScore(markets) : impliedScore(markets);
  if (score == null) return undefined;

  return {
    site,
    eventTicker: event.event_ticker,
    title: String(event.sub_title ?? event.title).trim(),
    url: `https://kalshi.com/markets/${SITES[site].series.toLowerCase()}/${SITES[site].slug}/${String(event.event_ticker).toLowerCase()}`,
    siteUrl: sourceUrl && !/\.com\/?(?:game\/?)?$/.test(sourceUrl) ? sourceUrl : undefined,
    settled,
    score,
    closeTime: markets.map((m) => m.close_time).filter(Boolean).sort().at(-1),
  };
}

// The settled score: every market's expiration_value is the site's score,
// else it is pinned down by a "yes" at N and a "no" at N + 1.
export function settledScore(markets: Json[]): number | undefined {
  const value = markets.map((m) => Number(m.expiration_value)).find((v) => Number.isFinite(v) && v >= 0 && v <= 100);
  if (value != null) return value;
  const yes = Math.max(...markets.filter((m) => m.result === 'yes').map((m) => Number(m.floor_strike)));
  const no = Math.min(...markets.filter((m) => m.result === 'no').map((m) => Number(m.floor_strike)));
  return no - yes === 1 ? no : undefined;
}

// The market's expected score. Each "Above N" market prices P(score > N);
// between strikes that is interpolated, from certainty at 0 down to none
// at 100, and summed over every whole score: E[S] = sum over k of P(S > k).
// Noisy prices are made to fall as N rises (a thin book can price "Above
// 70" under "Above 80").
export function impliedScore(markets: Json[]): number | undefined {
  const points = markets
    .map((m) => ({ strike: Number(m.floor_strike), p: chance(m) }))
    .filter((pt): pt is { strike: number; p: number } => pt.p != null && pt.strike >= 0 && pt.strike < 100)
    .sort((a, b) => a.strike - b.strike);
  if (!points.length) return undefined;
  // Pool-adjacent-violators: the closest non-increasing fit to the prices.
  const blocks: { strikes: number[]; p: number }[] = [];
  for (const pt of points) {
    blocks.push({ strikes: [pt.strike], p: pt.p });
    while (blocks.length > 1 && blocks.at(-2)!.p < blocks.at(-1)!.p) {
      const last = blocks.pop()!;
      const prev = blocks.pop()!;
      const n = prev.strikes.length + last.strikes.length;
      blocks.push({ strikes: [...prev.strikes, ...last.strikes], p: (prev.p * prev.strikes.length + last.p * last.strikes.length) / n });
    }
  }
  const curve = [{ strike: -1, p: 1 }, ...blocks.flatMap((b) => b.strikes.map((strike) => ({ strike, p: b.p }))), { strike: 100, p: 0 }];
  let total = 0;
  for (let k = 0; k < 100; k++) {
    const hi = curve.findIndex((pt) => pt.strike >= k);
    const a = curve[hi - 1] ?? curve[hi];
    const b = curve[hi];
    total += b.strike === a.strike ? b.p : a.p + ((b.p - a.p) * (k - a.strike)) / (b.strike - a.strike);
  }
  return Math.round(total);
}

// A market's chance of "yes": the midpoint of a tight book, else the last
// trade (a stale last price in a thin market is worse than a wide quote).
function chance(m: Json): number | undefined {
  const dollars = (key: string) => {
    const v = Number(m[`${key}_dollars`] ?? (m[key] != null ? Number(m[key]) / 100 : NaN));
    return Number.isFinite(v) ? v : undefined;
  };
  const bid = dollars('yes_bid');
  const ask = dollars('yes_ask');
  const last = dollars('last_price');
  if (bid != null && ask != null && ask > 0 && ask - bid <= 0.15) return (bid + ask) / 2;
  if (last != null && last > 0) return last;
  return bid != null && ask != null && ask > 0 ? (bid + ask) / 2 : undefined;
}

// Films must settle within a year of the pin, as ./screen.ts matches
// ratings; a Rotten Tomatoes film link that names its year must fit too.
function scoreYearFits(market: ScoreMarket, pinYear: number | undefined, site: ScoreSite) {
  const slugYear = site === 'Rotten Tomatoes' ? Number(market.siteUrl?.match(/\/m\/[^/]*_((?:19|20)\d\d)\/?$/)?.[1]) : NaN;
  if (Number.isFinite(slugYear) && !yearFits(slugYear, pinYear)) return false;
  const closeYear = market.closeTime ? new Date(market.closeTime).getUTCFullYear() : undefined;
  return yearFits(closeYear, pinYear);
}

/* Catalogue */

const eventsCache = new Map<ScoreSite, { at: number; events: Json[] }>();

// Every event of the site's one-series-for-all-titles series, open or not.
async function siteEvents(site: ScoreSite, signal: AbortSignal): Promise<Json[]> {
  const cached = eventsCache.get(site);
  if (cached && Date.now() - cached.at < EVENTS_TTL_MS) return cached.events;
  const events: Json[] = [];
  let cursor = '';
  for (let page = 0; page < 10; page++) {
    const res = await getJson<{ events?: Json[]; cursor?: string }>(
      `${KALSHI_API}/events?series_ticker=${SITES[site].series}&limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      signal,
    );
    if (!res?.events) return cached?.events ?? events;
    events.push(...res.events);
    if (!res.cursor || !res.events.length) break;
    cursor = res.cursor;
  }
  eventsCache.set(site, { at: Date.now(), events });
  return events;
}

async function getJson<T>(url: string, budget: AbortSignal): Promise<T | undefined> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.any([budget, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
    });
    if (!res.ok) {
      if (res.status !== 404) log.warn('score market lookup', res.status, url.slice(0, 120));
      return undefined;
    }
    return (await res.json()) as T;
  } catch (err) {
    log.warn('score market lookup failed', url.slice(0, 120), (err as Error).message);
    return undefined;
  }
}
