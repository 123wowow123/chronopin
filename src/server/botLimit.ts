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
