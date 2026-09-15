// The timeline groups pins and date markers into one "bag" per calendar day,
// in the viewer's time zone. A timed pin lands on the local date of its
// instant; an all-day pin (and a date marker) is stored at 00:00Z of its date,
// so it lands on that date wherever the viewer is.

import { dayKeyIn, daysBetween } from './format';
import type { DateTimeJson, PinJson } from './types';

export type Bag = {
  // "2026-09-14"
  day: string;
  pins: PinJson[];
  dateTimes: DateTimeJson[];
};

export function pinDayKey(pin: Pick<PinJson, 'utcStartDateTime' | 'allDay'>, timeZone: string): string {
  return pin.allDay ? dayKeyIn(pin.utcStartDateTime, 'UTC') : dayKeyIn(pin.utcStartDateTime, timeZone);
}

export type PinTense = 'past' | 'ongoing' | 'future';

// Past once it has ended (a pin without an end ends as it starts, an all-day
// one at the end of its day), future until it starts, ongoing between.
export function pinTense(
  pin: Pick<PinJson, 'utcStartDateTime' | 'utcEndDateTime' | 'allDay'>,
  now: Date | string | number,
  todayKey: string,
): PinTense {
  if (pin.allDay) {
    const startDay = dayKeyIn(pin.utcStartDateTime, 'UTC');
    if (startDay > todayKey) return 'future';
    const endDay = pin.utcEndDateTime ? dayKeyIn(pin.utcEndDateTime, 'UTC') : null;
    return (endDay ? endDay <= todayKey : startDay < todayKey) ? 'past' : 'ongoing';
  }
  const at = new Date(now).getTime();
  if (new Date(pin.utcStartDateTime).getTime() > at) return 'future';
  return new Date(pin.utcEndDateTime ?? pin.utcStartDateTime).getTime() <= at ? 'past' : 'ongoing';
}

function byStart(a: { utcStartDateTime: string; id: number }, b: { utcStartDateTime: string; id: number }) {
  return new Date(a.utcStartDateTime).getTime() - new Date(b.utcStartDateTime).getTime() || a.id - b.id;
}

// Merges pins and date markers into bags, keeping each item once (a later
// copy of a pin replaces the earlier one, e.g. after it was watched).
export function buildBags(pins: PinJson[], dateTimes: DateTimeJson[], timeZone: string): Bag[] {
  const bags = new Map<string, Bag>();
  const bagFor = (day: string) => {
    let bag = bags.get(day);
    if (!bag) {
      bag = { day, pins: [], dateTimes: [] };
      bags.set(day, bag);
    }
    return bag;
  };

  const seenPins = new Map<number, PinJson>();
  for (const pin of pins) {
    seenPins.set(pin.id, pin);
  }
  for (const pin of seenPins.values()) {
    bagFor(pinDayKey(pin, timeZone)).pins.push(pin);
  }

  const seenDates = new Map<number, DateTimeJson>();
  for (const dt of dateTimes) {
    seenDates.set(dt.id, dt);
  }
  for (const dt of seenDates.values()) {
    bagFor(dayKeyIn(dt.utcStartDateTime, 'UTC')).dateTimes.push(dt);
  }

  return [...bags.values()]
    .map((bag) => ({ ...bag, pins: bag.pins.sort(byStart), dateTimes: bag.dateTimes.sort(byStart) }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

export type TodayMarker = {
  // Index of the bag the TODAY marker goes before, or -1.
  index: number;
  // Every bag is in the past, so the marker goes after the last one.
  atEnd: boolean;
  // A bag already falls on today; it is highlighted instead of a marker.
  todayBagIndex: number;
};

export function resolveTodayMarker(bags: Bag[], todayKey: string): TodayMarker {
  const todayBagIndex = bags.findIndex((bag) => bag.day === todayKey);
  if (todayBagIndex !== -1 || !bags.length) {
    return { index: -1, atEnd: false, todayBagIndex };
  }
  const index = bags.findIndex((bag) => daysBetween(todayKey, bag.day) > 0);
  return { index, atEnd: index === -1, todayBagIndex };
}

// The element id the page scrolls to on load: the TODAY marker, or the bag
// that is today.
export function todayScrollId(bags: Bag[], marker: TodayMarker): string | null {
  if (marker.index !== -1 || marker.atEnd) {
    return 'today-marker';
  }
  if (marker.todayBagIndex !== -1) {
    return `day-${bags[marker.todayBagIndex].day}`;
  }
  return null;
}
