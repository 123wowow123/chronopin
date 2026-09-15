// Groups instants for the admin charts over time, by UTC day, week (starting
// Monday) or month depending on how long the range is.

export const TIME_RANGES = [
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: '1y', label: '12 months', days: 365 },
  { id: 'all', label: 'All time', days: null },
] as const;

export type TimeRange = (typeof TIME_RANGES)[number]['id'];
export type TimeUnit = 'day' | 'week' | 'month';

export type TimeBuckets<T> = {
  unit: TimeUnit;
  buckets: { start: string; items: T[] }[];
  // Items from before the first bucket, for running totals.
  before: T[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function floorTo(unit: TimeUnit, time: number): Date {
  const d = new Date(time);
  const day = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  if (unit === 'day') return new Date(day);
  if (unit === 'week') return new Date(day - ((d.getUTCDay() + 6) % 7) * DAY_MS);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function next(unit: TimeUnit, start: Date): Date {
  if (unit === 'day') return new Date(start.getTime() + DAY_MS);
  if (unit === 'week') return new Date(start.getTime() + 7 * DAY_MS);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}

export function unitFor(spanDays: number): TimeUnit {
  if (spanDays <= 62) return 'day';
  if (spanDays <= 731) return 'week';
  return 'month';
}

// "All time" starts at the earliest item. Items with no valid time are dropped.
export function timeBuckets<T>(items: T[], timeOf: (item: T) => string | Date, range: TimeRange, now = new Date()): TimeBuckets<T> {
  const timed = items.map((item) => ({ item, time: new Date(timeOf(item)).getTime() })).filter((t) => !isNaN(t.time));
  const days = TIME_RANGES.find((r) => r.id === range)?.days ?? null;
  const earliest = timed.length ? Math.min(...timed.map((t) => t.time)) : now.getTime();
  const from = days == null ? earliest : now.getTime() - (days - 1) * DAY_MS;
  const unit = unitFor(Math.ceil((now.getTime() - from) / DAY_MS) + 1);

  const first = floorTo(unit, from);
  const buckets: TimeBuckets<T>['buckets'] = [];
  for (let start = first; start.getTime() <= now.getTime(); start = next(unit, start)) {
    const end = next(unit, start).getTime();
    buckets.push({ start: start.toISOString(), items: timed.filter((t) => t.time >= start.getTime() && t.time < end).map((t) => t.item) });
  }
  return { unit, buckets, before: timed.filter((t) => t.time < first.getTime()).map((t) => t.item) };
}
