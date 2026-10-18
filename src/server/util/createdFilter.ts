// The timeline's "recently added" filter, matched against Pin.utcCreatedDateTime.
//
// A request names the window as a relative span - created_within=24h, 3d, or
// whatever the span picker builds - and the server resolves it against its own
// clock, so a viewer whose machine is hours off still gets a true 24 hours.
//
// The resolved instant then rides back out as created_since on the pagination
// links and is reused verbatim from there on. Re-resolving the span per page
// would slide the window mid-scroll, so pins sitting near its edge would be
// skipped or served twice as the timeline pages.

import { subMonths, subYears } from 'date-fns';
import { HttpError } from './httpError';

// "mo" has to precede "m": alternation is ordered, so otherwise "mo" matches
// as minutes and the trailing "o" fails the anchor.
const SPAN_PATTERN = /^(\d+(?:\.\d+)?)\s*(mo|m|h|d|w|y)$/i;

type SpanUnit = 'm' | 'h' | 'd' | 'w' | 'mo' | 'y';

const UNIT_NAMES: Record<SpanUnit, string> = {
  m: 'minutes',
  h: 'hours',
  d: 'days',
  w: 'weeks',
  mo: 'months',
  y: 'years',
};

// Fixed-length units in milliseconds. Months and years are calendar lengths
// instead (a year back from 12 Sep is 12 Sep); for the size limit they use
// moment.duration's average month (146097 / 4800 days), so the same spans are
// accepted as before.
const DAY_MS = 86_400_000;
const MONTH_MS = (146097 / 4800) * DAY_MS;
const UNIT_MS: Record<SpanUnit, number> = {
  m: 60_000,
  h: 3_600_000,
  d: DAY_MS,
  w: 7 * DAY_MS,
  mo: MONTH_MS,
  y: 12 * MONTH_MS,
};

// A window this wide filters nothing anyway, so there is no reason to accept more.
const MAX_SPAN_DAYS = 365 * 20;

export type CreatedQuery = { created_since?: string | null; created_within?: string | null };

// Returns the cutoff instant pins must have been created at or after, or null
// when the request asked for no such filter. Throws a 400 HttpError for a
// value it cannot make sense of, rather than quietly serving the whole
// timeline to someone who asked for the last day of it.
export function resolveCreatedSince(query: CreatedQuery | null | undefined, now?: Date): Date | null {
  const since = query?.created_since;
  const within = query?.created_within;

  if (since) {
    return parseInstant(since);
  }
  if (within) {
    return parseSpan(within, now || new Date());
  }
  return null;
}

function parseInstant(value: string): Date {
  const instant = new Date(value);
  if (isNaN(instant.getTime())) {
    throw new HttpError(400, `created_since is not a date: '${value}'`);
  }
  return instant;
}

function parseSpan(value: string, now: Date): Date {
  const match = SPAN_PATTERN.exec(String(value).trim());
  if (!match) {
    throw new HttpError(400, `created_within must be a count followed by m, h, d, w, mo or y: got '${value}'`);
  }

  const count = parseFloat(match[1]);
  const unit = match[2].toLowerCase() as SpanUnit;
  const spanMs = count * UNIT_MS[unit];

  if (spanMs <= 0) {
    throw new HttpError(400, `created_within must be greater than zero: got '${value}'`);
  }
  if (spanMs / UNIT_MS.d > MAX_SPAN_DAYS) {
    throw new HttpError(400, `created_within must be ${MAX_SPAN_DAYS} days or less: got '${value}'`);
  }

  if (unit === 'mo' || unit === 'y') {
    // Half a month has no exact meaning, so it is refused rather than quietly
    // answered with something else.
    if (count % 1 !== 0) {
      throw new HttpError(400, `created_within must be a whole number of ${UNIT_NAMES[unit]}: got '${value}'`);
    }
    return unit === 'mo' ? subMonths(now, count) : subYears(now, count);
  }

  // Fixed-length units are exact in milliseconds, so 1.5d really is 36 hours.
  return new Date(now.getTime() - spanMs);
}

// Whether a span is one this module would accept as created_within. Checked
// before a span is stored as somebody's saved default, so a value that would
// be refused the moment it was applied cannot be saved in the first place.
export function isValidSpan(value: string): boolean {
  try {
    parseSpan(value, new Date());
    return true;
  } catch {
    return false;
  }
}

// The extra query params a paginated response must echo so that later pages
// keep filtering against the very same cutoff this request resolved.
export function linkParams(createdSince: Date | null): Record<string, string> | null {
  return createdSince ? { created_since: createdSince.toISOString() } : null;
}
