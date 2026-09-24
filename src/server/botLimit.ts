import type { Bot } from '@/lib/bots';

// AI crawlers (src/lib/bots.ts, kind 'ai') are held to a steady pace; search
// engines, link previews and people are never limited. Each AI bot has its own
// budget, keyed by name rather than address: a crawler spreads over many
// addresses, and it is the bot's total that loads the server.
//
// A token bucket: BURST requests at once, then one every 1 / PER_SECOND
// seconds. Kept in memory on globalThis (one process on one VM), so a restart
// only hands every bot a fresh burst.
export const BURST = 30;
export const PER_SECOND = 0.5;

type Bucket = { tokens: number; at: number };

function buckets(): Map<string, Bucket> {
  const g = globalThis as unknown as { __chronopinBotBuckets?: Map<string, Bucket> };
  return (g.__chronopinBotBuckets ??= new Map());
}

// Null when the request may go ahead, else the seconds until it could (for
// Retry-After).
export function botRetryAfter(bot: Bot | null, now = Date.now()): number | null {
  if (bot?.kind !== 'ai') return null;
  const all = buckets();
  const bucket = all.get(bot.name) ?? { tokens: BURST, at: now };
  bucket.tokens = Math.min(BURST, bucket.tokens + ((now - bucket.at) / 1000) * PER_SECOND);
  bucket.at = now;
  all.set(bot.name, bucket);
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return null;
  }
  return Math.ceil((1 - bucket.tokens) / PER_SECOND);
}
