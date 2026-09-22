// The timeline: pages of pins walking forward or backward in time from a
// cursor, with the date markers (holidays, solstices...) that fall inside
// each page. Used by GET /api/pins, GET /api/main and the home page.

import config from '../config';
import DateTime from '../model/dateTime';
import { getTimelineConfidence } from '../model/appSetting';
import Pins from '../model/pins';
import { dayKeyToMs } from '@/lib/format';
import { pinDayKey } from '@/lib/timeline';
import { minConfidence as settingMinConfidence } from '@/lib/timelineConfidence';
import type { NearFilter } from '../util/nearFilter';

const pageSize = config.pagination.pageSize;

// SQL int max: the "no last pin" cursor when walking backward.
const MAX_PIN_ID = 2147483647;

export type TimelineQuery = {
  userId: number;
  // An ISO instant; a leading "-" walks backward from it. Absent means the
  // first page around now, or around a pin when given.
  fromDateTime?: string | null;
  around?: { dateTime: string; pinId: number } | null;
  lastPinId?: number;
  onlyFavorites?: boolean;
  createdSince?: Date | null;
  // The ring around the viewer a pin's place has to fall inside, or null for
  // the whole map. Only the browser knows where the viewer is, so this
  // arrives per request rather than being read off the server's own clock the
  // way createdSince is.
  near?: NearFilter | null;
};

// The score a pin needs to reach the timeline right now, or null when the
// admin has turned the filter off.
export async function timelineMinConfidence(): Promise<number | null> {
  return settingMinConfidence(await getTimelineConfidence());
}

export async function getPins({ userId, fromDateTime, around, lastPinId, onlyFavorites, createdSince, near }: TimelineQuery): Promise<Pins> {
  // A watched list keeps every pin, so it never needs the setting.
  const min = onlyFavorites ? null : await timelineMinConfidence();
  if (!fromDateTime) {
    if (around && !onlyFavorites) {
      return Pins.queryInitialByDate(new Date(around.dateTime), userId, pageSize, pageSize, createdSince, min, around.pinId, near);
    }
    const now = new Date();
    return onlyFavorites
      ? Pins.queryInitialByDateFilterByHasFavorite(now, userId, pageSize, pageSize, createdSince, near)
      : Pins.queryInitialByDate(now, userId, pageSize, pageSize, createdSince, min, 0, near);
  }

  if (fromDateTime[0] !== '-') {
    const last = lastPinId || 0;
    return onlyFavorites
      ? Pins.queryForwardByDateFilterByHasFavorite(fromDateTime, userId, last, pageSize, createdSince, near)
      : Pins.queryForwardByDate(fromDateTime, userId, last, pageSize, createdSince, min, near);
  }

  // Backward from the cursor pin itself. This used to start a day before it,
  // which the pre-Next.js server did too - but the cursor has always carried
  // the pin's id alongside its start, and (start, id) < (cursor, lastPinId)
  // already excludes the cursor pin without excluding anything else. The day
  // it stepped back over was simply dropped: 62 of 1548 pins could not be
  // reached by scrolling at all, 52 of them on the one day the first page
  // happened to end in.
  const last = lastPinId || MAX_PIN_ID;
  const from = new Date(fromDateTime.slice(1));
  return onlyFavorites
    ? Pins.queryBackwardByDateFilterByHasFavorite(from, userId, last, pageSize, createdSince, near)
    : Pins.queryBackwardByDate(from, userId, last, pageSize, createdSince, min, near);
}

// A page of pins plus the date markers between its first and last pin
// (stretched to the cursor on the side the page was walked from).
export async function getTimeline(query: TimelineQuery): Promise<Pins> {
  const pins = await getPins(query);
  const range = pins.minMaxDateTimePin();
  if (!range) {
    pins.dateTimes = [];
    return pins;
  }

  let start = new Date(range.min.utcStartDateTime);
  let end = new Date(range.max.utcStartDateTime);
  if (query.fromDateTime) {
    if (query.fromDateTime[0] !== '-') {
      start = new Date(query.fromDateTime);
    } else {
      end = new Date(query.fromDateTime.slice(1));
    }
  }
  pins.dateTimes = await DateTime.queryByStartEndDate(start, end);
  return pins;
}

// Clocks run from UTC-12 to UTC+14, so a day anywhere starts within this of
// its UTC midnight.
const ZONE_REACH_MS = 14 * 3_600_000;
// Past this many pins a day is cut short; no day has come near it.
const DAY_LIMIT = 500;

// Every instant a pin of `day` can start at, in some time zone.
function dayReach(day: string): [Date, Date] {
  const midnight = dayKeyToMs(day);
  return [new Date(midnight - ZONE_REACH_MS), new Date(midnight + 86_400_000 + ZONE_REACH_MS)];
}

// How many pins one day ("2026-09-14", or "-2560-01-01") has on the timeline,
// as a viewer in timeZone sees it: timed pins on their local date, all-day
// pins on their UTC date (see src/lib/timeline.ts). For the days at either end
// of what the timeline has loaded, which the pages may cut short, so their
// "View all" can count every pin they have.
export async function countDayPins({ day, timeZone, createdSince, near }: { day: string; timeZone: string; createdSince?: Date | null; near?: NearFilter | null }): Promise<number> {
  const [start, end] = dayReach(day);
  const starts = await Pins.listStartsBetween(start, end, createdSince, await timelineMinConfidence(), near);
  return Math.min(DAY_LIMIT, starts.filter((pin) => pinDayKey({ utcStartDateTime: pin.utcStartDateTime.toISOString(), allDay: pin.allDay }, timeZone) === day).length);
}
