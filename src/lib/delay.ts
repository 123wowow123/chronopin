// How far a pin's start has slipped: from the day the event was first
// promised for (Pin.originalStartDate) to where its start stands now. Both are
// read as UTC days, as all-day pins are stored; a timed pin's few hours either
// way do not matter to a delay counted in months.

import { compareDayKeys, dayKeyIn, dayKeyParts, daysBetween } from './format';
import type { PinJson } from './types';

export type PinDelay = {
  // The day first promised.
  from: string;
  days: number;
  // "3 weeks", "8 months", "2.5 years".
  label: string;
};

// A whole number of the unit, or years to the half: "1 year", "2.5 years".
function span(count: number, unit: string): string {
  return `${count} ${count === 1 ? unit : `${unit}s`}`;
}

export function delayLabel(fromKey: string, toKey: string): string {
  const days = daysBetween(fromKey, toKey);
  if (days < 14) {
    return span(days, 'day');
  }
  const [fy, fm] = dayKeyParts(fromKey);
  const [ty, tm] = dayKeyParts(toKey);
  const months = (ty - fy) * 12 + (tm - fm);
  if (months < 2) {
    return span(Math.round(days / 7), 'week');
  }
  if (months < 18) {
    return span(months, 'month');
  }
  return span(Math.round(months / 6) / 2, 'year');
}

// Null when the pin has no original date, or its start is not after it (a
// pin brought forward, or one whose delay was since made up).
export function pinDelay(pin: Pick<PinJson, 'originalStartDate' | 'utcStartDateTime'>): PinDelay | null {
  if (!pin.originalStartDate || !pin.utcStartDateTime) {
    return null;
  }
  const now = dayKeyIn(pin.utcStartDateTime, 'UTC');
  if (compareDayKeys(pin.originalStartDate, now) >= 0) {
    return null;
  }
  return { from: pin.originalStartDate, days: daysBetween(pin.originalStartDate, now), label: delayLabel(pin.originalStartDate, now) };
}

const DELAY_REASONING_MAX = 2000;

// Why a pin body's delay fields cannot be saved, checked before the write as
// the references' are.
export function delayProblem(pin: Record<string, unknown>): string | undefined {
  const { originalStartDate: from, delayReasoning: why } = pin;
  if (from != null && from !== '' && (typeof from !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(from) || Number.isNaN(Date.parse(from)))) {
    return 'originalStartDate must be YYYY-MM-DD.';
  }
  if (why != null && (typeof why !== 'string' || why.length > DELAY_REASONING_MAX)) {
    return `delayReasoning must be at most ${DELAY_REASONING_MAX} characters.`;
  }
  return undefined;
}
