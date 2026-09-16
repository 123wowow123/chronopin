import { dateFormat } from './format';
// When a pin starts and ends, grounded by its references. The source gives the
// pin's dates, rated by its dateConfidence; a reference can give a start date
// and an end date of its own (calendar dates, the end inclusive). The pin uses
// the most confident claim for each, and shows the range of all of them.
//
// Picking happens in the edit form (src/lib/pinForm.ts), in the author's local
// calendar like the date fields, so a timed pin keeps its time of day and does
// not slip a day across UTC. The dates the source gave are kept on the pin
// (sourceStartDateTime/sourceEndDateTime) whenever a reference overrides them.

import { referenceTime, SOURCE_CONFIDENCE } from './referenceConfidence';
import type { PinJson, PinReferenceJson } from './types';

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DateKey = 'startDate' | 'endDate';

type Claimant = Pick<PinReferenceJson, 'publishedDate' | 'utcCreatedDateTime' | 'startDate' | 'endDate'> & { confidence?: number | string };

// How far the pin's own dates are trusted: its source's rating.
export function sourceDateConfidence(dateConfidence: string | undefined): number | undefined {
  return SOURCE_CONFIDENCE[(dateConfidence || '').toLowerCase()];
}

// The most confident reference giving that date, when it outranks the source.
// A tie goes to the source, then to the newer reference; an unrated source is
// outranked by any scored reference.
export function topReference<T extends Claimant>(references: T[] | undefined, key: DateKey, sourceConfidence: number | undefined): T | undefined {
  let best: T | undefined;
  for (const reference of references || []) {
    const confidence = Number(reference.confidence);
    if (!YMD.test(reference[key] || '') || reference.confidence == null || reference.confidence === '' || !Number.isFinite(confidence)) continue;
    if (!best || confidence > Number(best.confidence) || (confidence === Number(best.confidence) && (referenceTime(reference) ?? 0) > (referenceTime(best) ?? 0))) {
      best = reference;
    }
  }
  return best && (sourceConfidence === undefined || Number(best.confidence) > sourceConfidence) ? best : undefined;
}

export function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

// Below this a date is shown as low confidence: under the source's
// "estimated", where confidenceClass turns amber.
export const LOW_DATE_CONFIDENCE = 50;

export const isLowConfidence = (confidence: number | undefined) => confidence !== undefined && confidence < LOW_DATE_CONFIDENCE;

type DateFields = { allDay: boolean; startDate: string; startTime: string; endDate: string; endTime: string };

// The date fields the pin is saved with, from the source's date fields and the
// references. The start and the end are each the most confident claim's day,
// on its own: the start keeps its time, and the end is not moved along with
// the start. A source that gives no end does not compete for it, so the best
// reference's end is used however low its confidence. An end before the start
// is dropped.
export function pickDates<T extends Claimant>(source: DateFields, references: T[], dateConfidence: string | undefined) {
  const confidence = sourceDateConfidence(dateConfidence);
  if (!source.startDate) {
    return { ...source, startFrom: undefined, endFrom: undefined };
  }
  const startFrom = topReference(references, 'startDate', confidence);
  const endFrom = topReference(references, 'endDate', source.endDate ? confidence : undefined);
  const startDate = startFrom?.startDate || source.startDate;
  let endDate = source.endDate;
  let endTime = source.endTime;
  if (endFrom?.endDate) {
    endDate = endFrom.endDate;
    // A reference gives only the day; a timed pin ends at its own end time,
    // or at the time it starts.
    if (!source.allDay && !endTime) endTime = source.startTime;
  }
  if (endDate && endDate < startDate) {
    endDate = '';
    endTime = '';
  }
  return { ...source, startDate, endDate, endTime, startFrom, endFrom };
}

// --- Showing the range on a pin ---------------------------------------------

export type DateClaim = {
  day: string; // YYYY-MM-DD
  confidence?: number;
  url?: string; // a reference's; none for the source
  isSource?: boolean;
  used: boolean;
};

// The days the claims span, and the best claim: the one the pin uses, which
// is the most confident (a tie goes to the source). When the pin uses none of
// them - no claim is scored - the first.
export type DateRange = { claims: DateClaim[]; earliest: string; latest: string; used?: DateClaim; best: DateClaim };

type RangePin = Pick<
  PinJson,
  'utcStartDateTime' | 'utcEndDateTime' | 'allDay' | 'sourceStartDateTime' | 'sourceEndDateTime' | 'dateConfidence' | 'references'
>;

// A confidence as a number, or undefined when unscored.
function scoreOf(confidence: number | string | null | undefined): number | undefined {
  const score = confidence == null || confidence === '' ? NaN : Number(confidence);
  return Number.isFinite(score) ? score : undefined;
}

// A stored instant as the calendar day it falls on: an all-day pin's in UTC,
// its exclusive end as the day before; a timed pin's in timeZone.
function dayOf(value: string, allDay: boolean | undefined, timeZone: string, isEnd = false): string | undefined {
  const time = new Date(value).getTime();
  if (isNaN(time)) return undefined;
  if (allDay) {
    return new Date(isEnd ? time - DAY_MS : time).toISOString().slice(0, 10);
  }
  return dateFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone }).format(time);
}

// Every claim on the pin's start and on its end, the source's first, and the
// range they span. A side with no claims is undefined.
export function pinDateRanges(pin: RangePin, timeZone: string): { start?: DateRange; end?: DateRange } {
  const confidence = sourceDateConfidence(pin.dateConfidence);
  const overridden = !!pin.sourceStartDateTime;
  const sourceStart = overridden ? pin.sourceStartDateTime : pin.utcStartDateTime;
  const sourceEnd = overridden ? pin.sourceEndDateTime : pin.utcEndDateTime;
  const startDay = sourceStart ? dayOf(sourceStart, pin.allDay, timeZone) : undefined;
  let endDay = sourceEnd ? dayOf(sourceEnd, pin.allDay, timeZone, true) : undefined;
  if (endDay && startDay && endDay <= startDay && pin.allDay) endDay = undefined;

  const range = (key: DateKey, sourceDay: string | undefined): DateRange | undefined => {
    // As in pickDates, a source without this date does not compete for it.
    const top = topReference(pin.references, key, sourceDay ? confidence : undefined);
    const claims: DateClaim[] = [];
    if (sourceDay) claims.push({ day: sourceDay, confidence, isSource: true, used: !top });
    for (const reference of pin.references || []) {
      const day = reference[key];
      if (day && YMD.test(day)) claims.push({ day, confidence: scoreOf(reference.confidence), url: reference.url, used: reference === top });
    }
    if (!claims.length) return undefined;
    const days = claims.map((c) => c.day).sort();
    const used = claims.find((c) => c.used);
    return { claims, earliest: days[0], latest: days[days.length - 1], used, best: used ?? claims[0] };
  };

  return { start: range('startDate', startDay), end: range('endDate', endDay) };
}
