import { timeBuckets, type TimeRange, type TimeUnit } from './timeStats';

// Sign-ups over time for the admin Users page.

export type SignupBucket = {
  start: string;
  signups: number;
  // Accounts created up to the end of this bucket, including earlier ones.
  total: number;
};

export type SignupStats = {
  unit: TimeUnit;
  buckets: SignupBucket[];
  // Sign-ups inside the range.
  signups: number;
  // Average sign-ups per unit across the range.
  perUnit: number;
};

// createdTimes are every account's creation instant (ISO strings or Dates).
export function signupStats(createdTimes: (string | Date)[], range: TimeRange, now = new Date()): SignupStats {
  const grouped = timeBuckets(createdTimes, (t) => t, range, now);
  let total = grouped.before.length;
  let signups = 0;
  const buckets = grouped.buckets.map(({ start, items }) => {
    total += items.length;
    signups += items.length;
    return { start, signups: items.length, total };
  });
  return { unit: grouped.unit, buckets, signups, perUnit: buckets.length ? signups / buckets.length : 0 };
}
