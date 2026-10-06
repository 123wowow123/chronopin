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

type Bucket = { tokens: number; at: number };

function limits(now: number) {
  const g = globalThis as unknown as { __chronopinCrawlerLimits?: { bots: Map<string, Bucket>; shared: Bucket } };
  return (g.__chronopinCrawlerLimits ??= { bots: new Map(), shared: { tokens: SHARED_BURST, at: now } });
}

function refill(bucket: Bucket, now: number, burst: number, perSecond: number) {
  bucket.tokens = Math.min(burst, bucket.tokens + (Math.max(0, now - bucket.at) / 1000) * perSecond);
  bucket.at = now;
}

// Null when the request may go ahead, else the seconds until it could (for
// Retry-After).
export function botRetryAfter(bot: Bot | null, now = Date.now()): number | null {
  if (!bot || (bot.kind !== 'ai' && !EXTRA_BOTS.has(bot.name))) return null;
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
