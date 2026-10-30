import { monitorEventLoopDelay } from 'node:perf_hooks';
import os from 'node:os';
import { AI_BOT_NAMES, type Bot } from '@/lib/bots';

// AI crawlers, the scrapers below and Applebot share a server-wide budget,
// with a separate budget per name: a crawler spreads over many addresses.
// Other search engines, link previews, monitors, scripts and people pass through.
//
// A token bucket: BURST requests at once, then one every 1 / PER_SECOND
// seconds. Kept in memory on globalThis (one process on one VM), so a restart
// only hands every bot a fresh burst.
export const BURST = 30;
export const PER_SECOND = 0.5;
export const SHARED_BURST = 60;
export const SHARED_PER_SECOND = 1;

// Scrapers: kind 'other' like curl and the uptime monitors, but they crawl
// the whole site for someone else's index (2026-10-04: Semrush + MJ12 ~4k hits
// in 30 minutes on the 2-vCPU VM).
// ShapBot made ~95k requests in a day and exhausted the VM's CPU credits.
const EXTRA_BOT_NAMES = ['AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot', 'DataForSeoBot', 'Screaming Frog', 'ShapBot', 'AionBot', 'Applebot'];
const EXTRA_BOTS = new Set(EXTRA_BOT_NAMES);
export const THROTTLED_BOT_NAMES = [...AI_BOT_NAMES, ...EXTRA_BOT_NAMES];

// Load shedding: while the server is struggling, the crawlers above are
// refused outright (not just rate limited) so that people and Google get the
// CPU. Google's own crawlers are not turned away but held to GOOGLE_PER_MINUTE
// requests a minute between them (owner, 2026-10-10). Two signals, since the load
// average lags a minute behind: event-loop delay (p99) and load per core.
// Hysteresis keeps it from flapping: it starts above the first pair and ends
// only below the second.
const SHED_SAMPLE_MS = 5_000;
const SHED_ON = { loopMs: 1_000, loadPerCore: 2 };
const SHED_OFF = { loopMs: 300, loadPerCore: 1.5 };
export const SHED_RETRY_AFTER = 300;
// All of Google's crawlers share this while the server is shedding.
export const GOOGLE_PER_MINUTE = 10;

type Shed = { on: boolean; at: number; hist: ReturnType<typeof monitorEventLoopDelay> | null };

function shedState(): Shed {
  const g = globalThis as unknown as { __chronopinShed?: Shed };
  return (g.__chronopinShed ??= { on: false, at: 0, hist: null });
}

// Whether the server is slow enough to turn crawlers away. Sampled at most
// every few seconds; `probe` is for tests.
export function shedding(now = Date.now(), probe?: () => { loopMs: number; loadPerCore: number }): boolean {
  const state = shedState();
  if (now - state.at < SHED_SAMPLE_MS) return state.on;
  state.at = now;
  let reading;
  if (probe) {
    reading = probe();
  } else {
    if (!state.hist) {
      state.hist = monitorEventLoopDelay({ resolution: 20 });
      state.hist.enable();
      return state.on;
    }
    reading = {
      loopMs: state.hist.percentile(99) / 1e6,
      loadPerCore: os.loadavg()[0] / Math.max(1, os.cpus().length),
    };
    state.hist.reset();
  }
  const limit = state.on ? SHED_OFF : SHED_ON;
  state.on = reading.loopMs >= limit.loopMs || reading.loadPerCore >= limit.loadPerCore;
  return state.on;
}

function isGoogle(bot: Bot): boolean {
  return /google/i.test(bot.name);
}

type Bucket = { tokens: number; at: number };

function limits(now: number) {
  const g = globalThis as unknown as { __chronopinCrawlerLimits?: { bots: Map<string, Bucket>; shared: Bucket; google: Bucket } };
  return (g.__chronopinCrawlerLimits ??= {
    bots: new Map(),
    shared: { tokens: SHARED_BURST, at: now },
    google: { tokens: GOOGLE_PER_MINUTE, at: now },
  });
}

function refill(bucket: Bucket, now: number, burst: number, perSecond: number) {
  bucket.tokens = Math.min(burst, bucket.tokens + (Math.max(0, now - bucket.at) / 1000) * perSecond);
  bucket.at = now;
}

// Null when the request may go ahead, else the seconds until it could (for
// Retry-After).
export function botRetryAfter(bot: Bot | null, now = Date.now()): number | null {
  if (!bot) return null;
  if (isGoogle(bot)) {
    // Unrestricted until the server is struggling, then GOOGLE_PER_MINUTE.
    if (!shedding(now)) return null;
    const { google } = limits(now);
    const perSecond = GOOGLE_PER_MINUTE / 60;
    refill(google, now, GOOGLE_PER_MINUTE, perSecond);
    if (google.tokens >= 1) {
      google.tokens -= 1;
      return null;
    }
    return Math.ceil((1 - google.tokens) / perSecond);
  }
  if (bot.kind !== 'ai' && !EXTRA_BOTS.has(bot.name)) return null;
  if (shedding(now)) return SHED_RETRY_AFTER;
  const { bots, shared } = limits(now);
  const bucket = bots.get(bot.name) ?? { tokens: BURST, at: now };
  refill(bucket, now, BURST, PER_SECOND);
  refill(shared, now, SHARED_BURST, SHARED_PER_SECOND);
  bots.set(bot.name, bucket);
  // Rejected requests consume neither budget, so one overactive bot cannot
  // spend the shared tokens that other crawlers would otherwise use.
  if (bucket.tokens >= 1 && shared.tokens >= 1) {
    bucket.tokens -= 1;
    shared.tokens -= 1;
    return null;
  }
  return Math.ceil(Math.max((1 - bucket.tokens) / PER_SECOND, (1 - shared.tokens) / SHARED_PER_SECOND));
}

// Everyone who is not a named bot, by address or signed-in user. A scraper
// that sends a browser user agent is not a Bot above, so every unidentified
// visitor gets a generous budget: well beyond a person clicking and
// prefetching, well below a crawler (owner asked 2026-10-17 after Singapore
// traffic looked like bots). A visitor who runs out is shown the heavy user
// plan (src/app/[lang]/heavy-use): with it the budget is LIGHT_*, still a limit
// but ten times looser. Admins and named crawlers have their own rules.
// Burst 90 (100 until 2026-10-26, 150 until 2026-10-22), refill 6/s: the figures macOS Safari readers were first given (2026-10-20, after
// their page requests were being refused), now the same for every browser.
export const IP_BURST = 90;
export const IP_PER_SECOND = 6;
export const LIGHT_BURST = 1_200;
export const LIGHT_PER_SECOND = 20;
const IP_MAX_ENTRIES = 20_000;

// A link prefetch (cost PREFETCH_COST) is a page's worth of links loading in
// the background, not a person asking for pages, so it spends a quarter token.
// `key` is "ip:<address>" or "u:<user id>". Null when the request may go on,
// else the seconds to wait.
export const PREFETCH_COST = 0.25;
export function ipRetryAfter(key: string, light = false, now = Date.now(), cost = 1): number | null {
  if (!key || key === 'ip:') return null;
  const burst = light ? LIGHT_BURST : IP_BURST;
  const perSecond = light ? LIGHT_PER_SECOND : IP_PER_SECOND;
  const g = globalThis as unknown as { __chronopinIpLimits?: Map<string, Bucket> };
  const buckets = (g.__chronopinIpLimits ??= new Map());
  const bucket = buckets.get(key) ?? { tokens: burst, at: now };
  refill(bucket, now, burst, perSecond);
  // Re-insert so the map stays in least-recently-used order.
  buckets.delete(key);
  buckets.set(key, bucket);
  if (buckets.size > IP_MAX_ENTRIES) buckets.delete(buckets.keys().next().value!);
  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    return null;
  }
  return Math.ceil((cost - bucket.tokens) / perSecond);
}

// A swarm of Chinese-language browsers (2026-10-26: ~1,100 addresses in five
// minutes, none above ~280 requests, so no per-address budget sees them) walks
// /it, /hi, /fr and /ms pages, searches first, with no Referer. People whose
// browser asks for Chinese read /zh. While the server sheds load the whole
// cohort (Chinese browser, signed out, a page in another non-Chinese language)
// shares one bucket; an ordinary visitor never meets it. Burst 20, refill 1/s.
export const MISMATCH_BURST = 20;
export const MISMATCH_PER_SECOND = 1;

// Whether a browser that asks for Chinese is on a page in another language.
// `prefix` is the page's language prefix, null for the plain English paths.
export function localeMismatch(acceptLanguage: string | null, prefix: string | null): boolean {
  if (!prefix || prefix === 'zh' || prefix.startsWith('zh-')) return false;
  const first = (acceptLanguage ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  return first === 'zh' || first.startsWith('zh-');
}

// Null when the request may go on (always, while the server is healthy), else
// the seconds to wait.
export function mismatchRetryAfter(now = Date.now(), shed = shedding(now)): number | null {
  if (!shed) return null;
  const g = globalThis as unknown as { __chronopinMismatch?: Bucket };
  const bucket = (g.__chronopinMismatch ??= { tokens: MISMATCH_BURST, at: now });
  refill(bucket, now, MISMATCH_BURST, MISMATCH_PER_SECOND);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return null;
  }
  return Math.ceil((1 - bucket.tokens) / MISMATCH_PER_SECOND);
}

// Searches with a query and no Referer (2026-10-29: 79% of 308K search requests
// in ten hours, 45,000 addresses at ~3 each, 88% asking for Chinese, 29% of all
// handler time): nobody clicked a tag or a search box on the site to get here,
// and Google's own visitors arrive with its Referer. They share one bucket
// while the server sheds load, after the gate and the per-cookie budget have
// let them through, so a person who pastes a search link is only held when the
// server is overloaded. Burst 30, refill 2/s.
export const BARE_SEARCH_BURST = 30;
export const BARE_SEARCH_PER_SECOND = 2;

// Null when the request may go on (always, while the server is healthy), else
// the seconds to wait.
export function bareSearchRetryAfter(now = Date.now(), shed = shedding(now)): number | null {
  if (!shed) return null;
  const g = globalThis as unknown as { __chronopinBareSearch?: Bucket };
  const bucket = (g.__chronopinBareSearch ??= { tokens: BARE_SEARCH_BURST, at: now });
  refill(bucket, now, BARE_SEARCH_BURST, BARE_SEARCH_PER_SECOND);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return null;
  }
  return Math.ceil((1 - bucket.tokens) / BARE_SEARCH_PER_SECOND);
}

// A pin-page budget per client id (the signed cookie the cookie gate issues),
// on top of the per-address one: a scraper spreads over thousands of addresses
// but each of its clients still reads pins, and a person opening a few pins
// from the timeline stays far inside it. A client that discards its cookie
// starts again, but only by going back through the gate's redirect.
// Burst 90, then one pin every 1.3 s (45 a minute); the same for every browser.
export const PIN_BURST = 90;
export const PIN_PER_SECOND = 0.75;
// Searches with a query (?q=) have a budget of their own per client id
// (2026-10-27): a crawler spread ~2,300 searches in 5 minutes over ~800
// addresses, about 3 each, so the per-address budget never saw it. Burst 30,
// then one every 2 s; a person clicking tags stays well inside it.
export const SEARCH_BURST = 30;
export const SEARCH_PER_SECOND = 0.5;
export function pinRetryAfter(clientId: string, now = Date.now(), cost = 1): number | null {
  return clientBudget('__chronopinPinLimits', PIN_BURST, PIN_PER_SECOND, clientId, now, cost);
}
export function searchRetryAfter(clientId: string, now = Date.now(), cost = 1): number | null {
  return clientBudget('__chronopinSearchLimits', SEARCH_BURST, SEARCH_PER_SECOND, clientId, now, cost);
}
function clientBudget(store: string, burst: number, perSecond: number, clientId: string, now: number, cost: number): number | null {
  if (!clientId) return null;
  const g = globalThis as unknown as Record<string, Map<string, Bucket> | undefined>;
  const buckets = (g[store] ??= new Map());
  const bucket = buckets.get(clientId) ?? { tokens: burst, at: now };
  refill(bucket, now, burst, perSecond);
  buckets.delete(clientId);
  buckets.set(clientId, bucket);
  if (buckets.size > IP_MAX_ENTRIES) buckets.delete(buckets.keys().next().value!);
  if (bucket.tokens >= cost) {
    bucket.tokens -= cost;
    return null;
  }
  return Math.ceil((cost - bucket.tokens) / perSecond);
}

// Chinese address ranges (owner, 2026-10-30): at most CHINA_VISITORS_PER_MINUTE
// different addresses are let in per minute between them. An address already
// admitted this minute carries on; a new one past the limit is told to wait for
// the next minute. A minute is a fixed window, kept in memory like the buckets.
export const CHINA_VISITORS_PER_MINUTE = 120;
const CHINA_WINDOW_MS = 60_000;

let chinaV6: [bigint, bigint][] | null = null;

// Whether the first number at or below `n` in the sorted [start, end, ...] pairs
// covers it.
function inFlatRanges(ranges: number[], n: number): boolean {
  let lo = 0;
  let hi = ranges.length / 2 - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (n < ranges[mid * 2]) hi = mid - 1;
    else if (n > ranges[mid * 2 + 1]) lo = mid + 1;
    else return true;
  }
  return false;
}

function v6Top(address: string): bigint | null {
  const [head, tail = ''] = address.toLowerCase().split('%')[0].split('::');
  const left = head ? head.split(':') : [];
  const right = address.includes('::') && tail ? tail.split(':') : [];
  if (!address.includes('::') && left.length !== 8) return null;
  const groups = address.includes('::') ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
  if (groups.length !== 8 || groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  let top = 0n;
  for (let i = 0; i < 4; i++) top = (top << 16n) | BigInt(parseInt(groups[i], 16));
  return top;
}

export async function isChineseAddress(address: string): Promise<boolean> {
  const { CHINA_V4, CHINA_V6 } = await import('./chinaRanges');
  const mapped = address.replace(/^::ffff:/i, '');
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(mapped);
  if (v4) return inFlatRanges(CHINA_V4, v4.slice(1).reduce((n, o) => n * 256 + Number(o), 0));
  if (!address.includes(':')) return false;
  const top = v6Top(address);
  if (top == null) return false;
  chinaV6 ??= CHINA_V6.map((r) => r.split('-').map((h) => BigInt(`0x${h}`)) as [bigint, bigint]);
  let lo = 0;
  let hi = chinaV6.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (top < chinaV6[mid][0]) hi = mid - 1;
    else if (top > chinaV6[mid][1]) lo = mid + 1;
    else return true;
  }
  return false;
}

// Null when the address may go on, else the seconds until the next window.
export function chinaRetryAfter(address: string, now = Date.now()): number | null {
  const g = globalThis as unknown as { __chronopinChina?: { windowStart: number; seen: Set<string> } };
  const state = (g.__chronopinChina ??= { windowStart: now, seen: new Set() });
  if (now - state.windowStart >= CHINA_WINDOW_MS) {
    state.windowStart = now;
    state.seen.clear();
  }
  if (state.seen.has(address)) return null;
  if (state.seen.size < CHINA_VISITORS_PER_MINUTE) {
    state.seen.add(address);
    return null;
  }
  return Math.max(1, Math.ceil((state.windowStart + CHINA_WINDOW_MS - now) / 1000));
}
