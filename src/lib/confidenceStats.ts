import { TIMELINE_MIN_CONFIDENCE } from './referenceConfidence';
import { timeBuckets, type TimeRange, type TimeUnit } from './timeStats';

// How many pins the home timeline shows and hides, for the admin statistics.

export type ConfidenceRow = { category: string | null; userName: string | null; confidence: number | null };

export type VisibilityCount = { label: string; showing: number; hidden: number };

export type ConfidenceStats = {
  // Null when the timeline's filter is off and nothing is hidden.
  threshold: number | null;
  total: number;
  showing: number;
  hidden: number;
  // Shown because nothing backs them with a score, not because they pass.
  unscored: number;
  // Scored pins in ten-point bands, 0-9 up to 90-100.
  bands: (VisibilityCount & { from: number; to: number })[];
  byCategory: VisibilityCount[];
  byAuthor: VisibilityCount[];
};

const BAND_COUNT = 10;

export function isHidden(confidence: number | null | undefined, threshold: number | null = TIMELINE_MIN_CONFIDENCE) {
  return threshold != null && confidence != null && confidence < threshold;
}

// Largest groups first; past `limit` the rest fold into one "Other" row.
function group(rows: ConfidenceRow[], key: (row: ConfidenceRow) => string, threshold: number | null, limit: number): VisibilityCount[] {
  const counts = new Map<string, VisibilityCount>();
  for (const row of rows) {
    const label = key(row);
    const count = counts.get(label) ?? { label, showing: 0, hidden: 0 };
    if (isHidden(row.confidence, threshold)) count.hidden++;
    else count.showing++;
    counts.set(label, count);
  }
  const sorted = [...counts.values()].sort((a, b) => b.showing + b.hidden - (a.showing + a.hidden) || a.label.localeCompare(b.label));
  if (sorted.length <= limit) {
    return sorted;
  }
  const rest = sorted.slice(limit - 1);
  const other = {
    label: `Other (${rest.length})`,
    showing: rest.reduce((sum, c) => sum + c.showing, 0),
    hidden: rest.reduce((sum, c) => sum + c.hidden, 0),
  };
  return [...sorted.slice(0, limit - 1), other];
}

export function confidenceStats(rows: ConfidenceRow[], threshold: number | null = TIMELINE_MIN_CONFIDENCE, limit = 12): ConfidenceStats {
  const bands = Array.from({ length: BAND_COUNT }, (_, i) => ({
    from: i * 10,
    to: i === BAND_COUNT - 1 ? 100 : i * 10 + 9,
    label: i === BAND_COUNT - 1 ? '90–100' : `${i * 10}–${i * 10 + 9}`,
    showing: 0,
    hidden: 0,
  }));
  let hidden = 0;
  let unscored = 0;
  for (const row of rows) {
    if (row.confidence == null) {
      unscored++;
      continue;
    }
    const band = bands[Math.min(BAND_COUNT - 1, Math.max(0, Math.floor(row.confidence / 10)))];
    if (isHidden(row.confidence, threshold)) {
      band.hidden++;
      hidden++;
    } else {
      band.showing++;
    }
  }
  return {
    threshold,
    total: rows.length,
    showing: rows.length - hidden,
    hidden,
    unscored,
    bands,
    byCategory: group(rows, (r) => r.category || 'Uncategorized', threshold, limit),
    byAuthor: group(rows, (r) => r.userName || 'Unknown', threshold, limit),
  };
}

// A pin's creation instant and whether the timeline hides it today.
export type CreatedPin = { created: string; hidden: boolean };

export type PinTimeBucket = {
  start: string;
  showing: number;
  hidden: number;
  // Pins created up to the end of this bucket, including earlier ones.
  total: number;
};

export type PinTimeStats = {
  unit: TimeUnit;
  buckets: PinTimeBucket[];
  // Pins created inside the range, and how many of those are hidden now.
  added: number;
  hidden: number;
  // Average pins added per unit across the range.
  perUnit: number;
};

export function pinTimeStats(pins: CreatedPin[], range: TimeRange, now = new Date()): PinTimeStats {
  const grouped = timeBuckets(pins, (p) => p.created, range, now);
  let total = grouped.before.length;
  let added = 0;
  let hidden = 0;
  const buckets = grouped.buckets.map(({ start, items }) => {
    const bucketHidden = items.filter((p) => p.hidden).length;
    total += items.length;
    added += items.length;
    hidden += bucketHidden;
    return { start, showing: items.length - bucketHidden, hidden: bucketHidden, total };
  });
  return { unit: grouped.unit, buckets, added, hidden, perUnit: buckets.length ? added / buckets.length : 0 };
}
