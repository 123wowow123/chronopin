'use strict';

import moment from 'moment';

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

// "mo" has to precede "m": alternation is ordered, so otherwise "mo" matches
// as minutes and the trailing "o" fails the anchor.
const SPAN_PATTERN = /^(\d+(?:\.\d+)?)\s*(mo|m|h|d|w|y)$/i;

const SPAN_UNITS = {
  m: 'minutes',
  h: 'hours',
  d: 'days',
  w: 'weeks',
  mo: 'months',
  y: 'years'
};

// Months and years are calendar lengths rather than fixed ones: a year back
// from 12 Sep is 12 Sep, whatever number of days that happens to span.
const CALENDAR_UNITS = ['months', 'years'];

// Keeps a subtracted span inside the range DATETIME2 can hold. A window this
// wide filters nothing anyway, so there is no reason to accept more.
const MAX_SPAN_DAYS = 365 * 20;

// Returns the cutoff instant pins must have been created at or after, or null
// when the request asked for no such filter. Throws a 400-bearing error for a
// value it cannot make sense of, rather than quietly serving the whole
// timeline to someone who asked for the last day of it.
export function resolveCreatedSince(query, now) {
  const since = query && query.created_since;
  const within = query && query.created_within;

  if (since) {
    return _parseInstant(since);
  }
  if (within) {
    return _parseSpan(within, now || new Date());
  }
  return null;
}

function _parseInstant(value) {
  const instant = new Date(value);
  if (isNaN(instant.getTime())) {
    throw _badRequest(`created_since is not a date: '${value}'`);
  }
  return instant;
}

function _parseSpan(value, now) {
  const match = SPAN_PATTERN.exec(String(value).trim());
  if (!match) {
    throw _badRequest(
      `created_within must be a count followed by m, h, d, w, mo or y: got '${value}'`);
  }

  const count = parseFloat(match[1]);
  const unit = SPAN_UNITS[match[2].toLowerCase()];
  const span = moment.duration(count, unit);

  if (span.asMilliseconds() <= 0) {
    throw _badRequest(`created_within must be greater than zero: got '${value}'`);
  }
  if (span.asDays() > MAX_SPAN_DAYS) {
    throw _badRequest(
      `created_within must be ${MAX_SPAN_DAYS} days or less: got '${value}'`);
  }

  if (CALENDAR_UNITS.indexOf(unit) !== -1) {
    // Half a month has no exact meaning and moment would round it to a whole
    // one, so it is refused rather than quietly answered with something else.
    if (count % 1 !== 0) {
      throw _badRequest(
        `created_within must be a whole number of ${unit}: got '${value}'`);
    }
    return moment(now).subtract(count, unit).toDate();
  }

  // Fixed-length units are subtracted as milliseconds instead: moment rounds a
  // fractional day or week to a whole one, which would quietly turn a span
  // like 1.5d into 2d, and for these units the conversion is exact.
  return moment(now).subtract(span.asMilliseconds(), 'ms').toDate();
}

// The extra query params a paginated response must echo so that later pages
// keep filtering against the very same cutoff this request resolved.
export function linkParams(createdSince) {
  return createdSince ? { created_since: createdSince.toISOString() } : null;
}

function _badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}
