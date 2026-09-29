import { timeBuckets, type TimeRange, type TimeUnit } from './timeStats';

// Pin page views over time for the admin Views page. A view is one viewer on
// one pin in one UTC day (see PinView), so reloads never add to it.

// The views recorded on one UTC day, as "YYYY-MM-DD".
export type ViewDay = { day: string; signedIn: number; guests: number };

export type ViewBucket = { start: string; signedIn: number; guests: number };

export type ViewStats = {
  unit: TimeUnit;
  buckets: ViewBucket[];
  // Views inside the range.
  views: number;
  signedIn: number;
  // Average views per unit across the range.
  perUnit: number;
};

export function viewStats(days: ViewDay[], range: TimeRange, now = new Date()): ViewStats {
  const grouped = timeBuckets(days, (d) => `${d.day}T00:00:00Z`, range, now);
  let views = 0;
  let signedIn = 0;
  const buckets = grouped.buckets.map(({ start, items }) => {
    const bucket = {
      start,
      signedIn: items.reduce((n, d) => n + d.signedIn, 0),
      guests: items.reduce((n, d) => n + d.guests, 0),
    };
    views += bucket.signedIn + bucket.guests;
    signedIn += bucket.signedIn;
    return bucket;
  });
  return { unit: grouped.unit, buckets, views, signedIn, perUnit: buckets.length ? views / buckets.length : 0 };
}

// The first UTC day the range's chart covers ("YYYY-MM-DD"), or null for all
// time, so per-pin totals line up with the chart's first column.
export function rangeStartDay(range: TimeRange, now = new Date()): string | null {
  if (range === 'all') return null;
  return timeBuckets([], (d: string) => d, range, now).buckets[0].start.slice(0, 10);
}
