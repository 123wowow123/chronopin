// The weekly "my timeline" email (src/server/services/weeklyDigest.ts): which
// moment it goes out, and the admin switch for it. Pure, so the clock logic is
// testable without a database.

export type WeeklyDigestSetting = { enabled: boolean };
// Off until the owner turns it on: it sends real email.
export const DEFAULT_WEEKLY_DIGEST: WeeklyDigestSetting = { enabled: false };

export function parseWeeklyDigest(value: unknown): { setting: WeeklyDigestSetting } | { problem: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { problem: 'Expected { enabled }' };
  const { enabled } = value as Record<string, unknown>;
  if (typeof enabled !== 'boolean') return { problem: 'enabled must be true or false' };
  return { setting: { enabled } };
}

// Sent on Mondays from this hour (UTC): morning in the Americas, afternoon in
// Europe, evening in Asia. One send time keeps the clock simple; a user's own
// zone is not stored, only read from a cookie while they browse.
export const DIGEST_HOUR_UTC = 13;
// A week missed while every server was down is still sent if they are back
// within this long after the slot.
export const DIGEST_CATCH_UP_MS = 24 * 60 * 60 * 1000;
// The days ahead an email looks, and how many pins each part lists at most.
export const DIGEST_DAYS_AHEAD = 7;
export const DIGEST_PART_LIMIT = 8;
export const DIGEST_TOTAL_LIMIT = 20;

const DAY_MS = 24 * 60 * 60 * 1000;

// The Monday (UTC) at or before `at`, as YYYY-MM-DD.
export function digestWeekStart(at: Date): string {
  const midnight = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
  const sinceMonday = (at.getUTCDay() + 6) % 7;
  return new Date(midnight - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

// The week to send now, or null outside the slot (Monday DIGEST_HOUR_UTC and
// the catch-up window after it).
export function dueDigestWeek(now: Date): string | null {
  const week = digestWeekStart(now);
  const slot = Date.parse(week) + DIGEST_HOUR_UTC * 60 * 60 * 1000;
  const late = now.getTime() - slot;
  return late >= 0 && late < DIGEST_CATCH_UP_MS ? week : null;
}
