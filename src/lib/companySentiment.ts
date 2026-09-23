// A company's sentiment over time, for the graph its search shows
// (src/components/timeline/CompanySentiment.tsx): a dot per scored pin, at
// when its event happens, and a dot per scored comment, at when it was
// written, each -1..1; and through each, the average per period - a year when
// the points span years, else a month - so the line says which way things ran
// without one odd pin dragging it.

export type SentimentPoint = { at: number; value: number };

export type SentimentBucket = { at: number; value: number; count: number };

export type CompanySentiment = {
  // Scored pins: id and title for the tooltip and the link.
  pins: { id: number; title: string; at: string; value: number }[];
  comments: { at: string; value: number }[];
};

const YEAR_MS = 365.25 * 86400000;

// Month buckets under three years of points, else years.
export function bucketUnit(points: SentimentPoint[]): 'month' | 'year' {
  if (points.length < 2) return 'month';
  const times = points.map((p) => p.at);
  return Math.max(...times) - Math.min(...times) < 3 * YEAR_MS ? 'month' : 'year';
}

// The average per bucket, each placed at the middle of its period, in order.
export function averageByPeriod(points: SentimentPoint[], unit: 'month' | 'year'): SentimentBucket[] {
  const sums = new Map<string, { start: number; end: number; sum: number; count: number }>();
  for (const point of points) {
    const date = new Date(point.at);
    const year = date.getUTCFullYear();
    const month = unit === 'month' ? date.getUTCMonth() : 0;
    const key = `${year}-${month}`;
    let bucket = sums.get(key);
    if (!bucket) {
      const start = new Date(0);
      start.setUTCFullYear(year, month, 1);
      const end = new Date(start);
      if (unit === 'month') end.setUTCMonth(month + 1);
      else end.setUTCFullYear(year + 1);
      bucket = { start: start.getTime(), end: end.getTime(), sum: 0, count: 0 };
      sums.set(key, bucket);
    }
    bucket.sum += point.value;
    bucket.count++;
  }
  return [...sums.values()]
    .map((b) => ({ at: (b.start + b.end) / 2, value: Math.round((b.sum / b.count) * 100) / 100, count: b.count }))
    .sort((a, b) => a.at - b.at);
}

// What the info button says about a company's pin news: where it stands,
// which way it has been going, what is coming, and the pins doing the most to
// move it. Built from the scores alone - no model call - so it is always in
// step with the graph.
//
// The direction sets the newest third of the pins that have happened against
// the ones before them, as the comment mood does (./commentMood.ts); pins
// still to come sit out of it, since their scores say what is expected, not
// what came of it.

export type ExplainedPin = CompanySentiment['pins'][number];

export type SentimentExplanation = {
  average: number;
  count: number;
  // Null with fewer than MIN_FOR_TREND pins that have happened.
  trend: { direction: 'up' | 'down' | 'steady'; recent: number; earlier: number } | null;
  upcoming: { average: number; count: number } | null;
  // The recent pins furthest above and below the average (by DRIVER_GAP or
  // more), at most two each.
  lifting: ExplainedPin[];
  dragging: ExplainedPin[];
};

const MIN_FOR_TREND = 4;
// Pin scores bunch closer together than comments', so a smaller move counts.
const TREND_THRESHOLD = 0.15;
const DRIVERS = 2;
// How far from the average a pin must sit to be named as lifting or dragging
// it: a +0.10 pin under a +0.25 average is not what anyone would call bad news.
const DRIVER_GAP = 0.2;

const round = (value: number) => Math.round(value * 100) / 100;
const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

export function explainSentiment(pins: ExplainedPin[], now: number): SentimentExplanation | null {
  if (!pins.length) return null;
  const sorted = [...pins].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const past = sorted.filter((p) => Date.parse(p.at) <= now);
  const future = sorted.filter((p) => Date.parse(p.at) > now);
  const average = round(mean(sorted.map((p) => p.value)));

  let trend: SentimentExplanation['trend'] = null;
  // The pins the drivers are picked from: the newest third that has happened,
  // or all of them when there are too few to split.
  let recentPins = past;
  if (past.length >= MIN_FOR_TREND) {
    const recentCount = Math.max(2, Math.round(past.length / 3));
    recentPins = past.slice(-recentCount);
    const recent = round(mean(recentPins.map((p) => p.value)));
    const earlier = round(mean(past.slice(0, -recentCount).map((p) => p.value)));
    const shift = recent - earlier;
    trend = { direction: shift >= TREND_THRESHOLD ? 'up' : shift <= -TREND_THRESHOLD ? 'down' : 'steady', recent, earlier };
  }
  const pool = recentPins.length ? recentPins : future;
  const byValue = [...pool].sort((a, b) => b.value - a.value || Date.parse(b.at) - Date.parse(a.at));
  return {
    average,
    count: sorted.length,
    trend,
    upcoming: future.length ? { average: round(mean(future.map((p) => p.value))), count: future.length } : null,
    lifting: byValue.filter((p) => p.value >= average + DRIVER_GAP).slice(0, DRIVERS),
    dragging: byValue.reverse().filter((p) => p.value <= average - DRIVER_GAP).slice(0, DRIVERS),
  };
}
