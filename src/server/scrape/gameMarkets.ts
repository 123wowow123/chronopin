/**
 * Prediction markets on a game, as references for its pin: Kalshi's "GTA 6
 * release date" and Polymarket's "GTA VI released by...?". A market is an
 * independent read on the date, with a volume that says how much anyone
 * believes it (see "Check prediction-market refs" in docs/okf/scraping).
 *
 * Kalshi files each game's markets in a series of its own (KXGTA6) whose title
 * names the game, so the series list is searched by title and the matching
 * series' events read. Polymarket's public search takes the name. A market
 * counts only when its title carries the game's name (as the pin, an
 * abbreviation or a numeral spells it) - GTA 6's markets are not Grand Theft
 * Auto V's. Kalshi's Metacritic ladders are left to the pin's ratings
 * (./scoreMarkets.ts). Nothing here throws: a failed lookup is no reference.
 */

import { siteUrl } from '@/lib/appConfig';
import type { PinReferenceJson } from '@/lib/types';
import log from '../util/log';
import { normalizeTitle, titleCandidates, type ScreenQuery } from './screen';

const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const POLYMARKET_API = 'https://gamma-api.polymarket.com';
const TIMEOUT_MS = 8000;
const SERIES_TTL_MS = 30 * 60 * 1000;
const USER_AGENT = `ChronopinBot/1.0 (+${siteUrl})`;
// A book smaller than this is four bets, not evidence.
const MIN_VOLUME = 2000;
const MOST_PER_EXCHANGE = 2;
const SCORE_SERIES = /metacritic|rotten tomatoes|\bRT\b/i;

type Json = Record<string, any>;
export type GameMarketReference = Pick<PinReferenceJson, 'url' | 'title' | 'confidence' | 'reasoning'>;

async function getJson(url: string): Promise<any> {
  try {
    // Kalshi's keyless limit answers 429 under a run of lookups: one more try.
    for (let attempt = 0; ; attempt++) {
      const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 429 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
        continue;
      }
      return res.ok ? await res.json() : undefined;
    }
  } catch (err) {
    log.warn('game market lookup failed:', (err as Error).message);
    return undefined;
  }
}

// A date word cut out of a title ("October release date announced for ...") is
// no game's name.
const CALENDAR_WORD = /^(january|february|march|april|may|june|july|august|september|october|november|december)$/;
const GAME_TAGS = /^(games?|video-?games?|gaming)$/i;

const ROMAN: Record<string, string> = { ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };

// The names a market might use for a game: as written, with a trailing roman
// numeral as a digit ("grand theft auto vi" -> "... 6"), and with the
// franchise's usual abbreviation ("gta 6").
export function gameAliases(titles: string[]): string[] {
  const out = new Set<string>();
  for (const title of titles) {
    const base = normalizeTitle(title, { keepThe: true });
    if (base.length < 3 || CALENDAR_WORD.test(base)) continue;
    const words = base.split(' ');
    const last = words.at(-1)!;
    const variants = [base];
    if (ROMAN[last] && words.length > 1) variants.push([...words.slice(0, -1), ROMAN[last]].join(' '));
    for (const v of [...variants]) {
      if (v.startsWith('grand theft auto ')) variants.push(v.replace('grand theft auto', 'gta'));
    }
    variants.forEach((v) => out.add(v));
  }
  return [...out];
}

// One word is too loose a name on its own ("Fable" is also an AI model's):
// the market then has to be filed under games.
const loose = (aliases: string[]) => !aliases.some((a) => a.includes(' '));

const mentions = (text: string, aliases: string[]) => {
  const padded = ` ${normalizeTitle(text, { keepThe: true })} `;
  return aliases.some((a) => padded.includes(` ${a} `));
};

let seriesCache: { at: number; series: Json[] } | undefined;
async function allSeries(): Promise<Json[]> {
  if (seriesCache && Date.now() - seriesCache.at < SERIES_TTL_MS) return seriesCache.series;
  const body = await getJson(`${KALSHI_API}/series?category=Entertainment`);
  const series: Json[] = Array.isArray(body?.series) ? body.series : [];
  if (series.length) seriesCache = { at: Date.now(), series };
  return series;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'market';
const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;

async function kalshiReferences(aliases: string[]): Promise<(GameMarketReference & { volume: number })[]> {
  const series = (await allSeries()).filter((s) => !SCORE_SERIES.test(String(s.title ?? '')) && mentions(String(s.title ?? ''), aliases) && (!loose(aliases) || (s.tags ?? []).some((t: string) => GAME_TAGS.test(t))));
  const found: (GameMarketReference & { volume: number })[] = [];
  for (const s of series.slice(0, 6)) {
    const body = await getJson(`${KALSHI_API}/events?series_ticker=${encodeURIComponent(s.ticker)}&with_nested_markets=true&limit=10`);
    for (const event of (body?.events ?? []) as Json[]) {
      const markets: Json[] = event.markets ?? [];
      const volume = markets.reduce((sum, m) => sum + (Number(m.volume_fp) || 0) * (Number(m.last_price_dollars) || 0), 0);
      if (!markets.length || volume < MIN_VOLUME) continue;
      const settled = markets.every((m) => m.result === 'yes' || m.result === 'no');
      const title = String(event.title ?? s.title);
      found.push({
        url: `https://kalshi.com/markets/${String(s.ticker).toLowerCase()}/${slug(String(s.title ?? title))}/${String(event.event_ticker).toLowerCase()}`,
        title: `${title} - Kalshi`,
        confidence: 80,
        reasoning: `Kalshi market "${title}", ${settled ? 'settled' : 'open'}, with about ${dollars(volume)} traded: traders' independent read on the game.`,
        volume,
      });
    }
  }
  return found.sort((a, b) => b.volume - a.volume);
}

async function polymarketReferences(query: string, aliases: string[]): Promise<(GameMarketReference & { volume: number })[]> {
  const body = await getJson(`${POLYMARKET_API}/public-search?q=${encodeURIComponent(query)}&limit_per_type=10&events_status=all`);
  const events: Json[] = Array.isArray(body?.events) ? body.events : [];
  return events
    .filter((e) => typeof e.slug === 'string' && mentions(String(e.title ?? ''), aliases) && (Number(e.volume) || 0) >= MIN_VOLUME && (!loose(aliases) || (e.tags ?? []).some((t: Json) => GAME_TAGS.test(String(t.slug ?? '')))))
    .map((e) => ({
      url: `https://polymarket.com/event/${e.slug}`,
      title: `${e.title} - Polymarket`,
      confidence: 75,
      reasoning: `Polymarket market "${e.title}", ${e.closed ? 'closed' : 'open'}, with about ${dollars(Number(e.volume))} traded: traders' independent read on the game.`,
      volume: Number(e.volume),
    }))
    .sort((a, b) => b.volume - a.volume);
}

// The markets on the game a pin is about, biggest book first on each exchange.
export async function findGameMarkets(query: Pick<ScreenQuery, 'workTitle' | 'pinTitle'>): Promise<GameMarketReference[]> {
  try {
    const titles = titleCandidates(query);
    const aliases = gameAliases(titles);
    if (!aliases.length) return [];
    // Polymarket searches by words, so the plainest name (the first candidate).
    const [kalshi, polymarket] = await Promise.all([kalshiReferences(aliases), polymarketReferences(titles[0], aliases)]);
    return [...kalshi.slice(0, MOST_PER_EXCHANGE), ...polymarket.slice(0, MOST_PER_EXCHANGE)].map(({ volume: _volume, ...ref }) => ref);
  } catch (err) {
    log.warn('game market lookup failed:', (err as Error).message);
    return [];
  }
}
