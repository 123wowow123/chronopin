'use strict';

// An all-day pin covers whole UTC calendar days: utcStartDateTime is 00:00Z of
// its first day and utcEndDateTime, when set, is 00:00Z of the day after its
// last day (exclusive), so a one-day pin ends at the next midnight or has no
// end. The "CK_Pin_allDayUtcMidnight" constraint enforces the midnight part.
//
// Values are floored to their UTC day. That also lands the old encodings on
// the intended dates: browser-local midnight in the Americas (07:00Z/08:00Z),
// noon UTC, and a local 23:59:59.999 inclusive end (which floors to the next
// UTC midnight).
//
// Timed pins are real instants and are left alone. Mutates and returns pin.
export function normalizeAllDayDates(pin) {
  if (!pin || !pin.allDay) {
    return pin;
  }
  const start = floorToUtcDay(pin.utcStartDateTime);
  let end = floorToUtcDay(pin.utcEndDateTime);
  if (start && end && end <= start) {
    end = null;
  }
  if (start) {
    pin.utcStartDateTime = start;
  }
  pin.utcEndDateTime = end;
  return pin;
}

function floorToUtcDay(value) {
  if (value == null || value === '') {
    return null;
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return value;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
