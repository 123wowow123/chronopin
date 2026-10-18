import type { BotKind } from './bots';
import { timeBuckets, type TimeRange, type TimeUnit } from './timeStats';

// Bot requests over time for the admin Bots page, by kind of bot (see
// BotVisit). A request is one page a bot asked for, so a crawl of a hundred
// pages is a hundred.

// The requests recorded on one UTC day, as "YYYY-MM-DD".
export type BotDay = { day: string } & Record<BotKind, number>;

export type BotBucket = { start: string } & Record<BotKind, number>;

export type BotStats = {
  unit: TimeUnit;
  buckets: BotBucket[];
  // Requests inside the range, in all and by kind.
  requests: number;
  byKind: Record<BotKind, number>;
  // Average requests per unit across the range.
  perUnit: number;
};

const KINDS: BotKind[] = ['search', 'ai', 'social', 'other'];

export function botStats(days: BotDay[], range: TimeRange, now = new Date()): BotStats {
  const grouped = timeBuckets(days, (d) => `${d.day}T00:00:00Z`, range, now);
  const byKind: Record<BotKind, number> = { search: 0, ai: 0, social: 0, other: 0 };
  const buckets = grouped.buckets.map(({ start, items }) => {
    const bucket = { start } as BotBucket;
    for (const kind of KINDS) {
      bucket[kind] = items.reduce((n, d) => n + d[kind], 0);
      byKind[kind] += bucket[kind];
    }
    return bucket;
  });
  const requests = KINDS.reduce((n, kind) => n + byKind[kind], 0);
  return { unit: grouped.unit, buckets, requests, byKind, perUnit: buckets.length ? requests / buckets.length : 0 };
}
