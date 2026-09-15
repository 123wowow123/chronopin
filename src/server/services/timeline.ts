// The timeline: pages of pins walking forward or backward in time from a
// cursor, with the date markers (holidays, solstices...) that fall inside
// each page. Used by GET /api/pins, GET /api/main and the home page.

import { subDays } from 'date-fns';
import config from '../config';
import DateTime from '../model/dateTime';
import Pins from '../model/pins';

const pageSize = config.pagination.pageSize;

// SQL int max: the "no last pin" cursor when walking backward.
const MAX_PIN_ID = 2147483647;

export type TimelineQuery = {
  userId: number;
  // An ISO instant; a leading "-" walks backward from it. Absent means the
  // first page around now.
  fromDateTime?: string | null;
  lastPinId?: number;
  onlyFavorites?: boolean;
  createdSince?: Date | null;
};

export function getPins({ userId, fromDateTime, lastPinId, onlyFavorites, createdSince }: TimelineQuery): Promise<Pins> {
  if (!fromDateTime) {
    const now = new Date();
    return onlyFavorites
      ? Pins.queryInitialByDateFilterByHasFavorite(now, userId, pageSize, pageSize, createdSince)
      : Pins.queryInitialByDate(now, userId, pageSize, pageSize, createdSince);
  }

  if (fromDateTime[0] !== '-') {
    const last = lastPinId || 0;
    return onlyFavorites
      ? Pins.queryForwardByDateFilterByHasFavorite(fromDateTime, userId, last, pageSize, createdSince)
      : Pins.queryForwardByDate(fromDateTime, userId, last, pageSize, createdSince);
  }

  // Walking backward starts a day before the cursor, as it always has.
  const last = lastPinId || MAX_PIN_ID;
  const from = subDays(new Date(fromDateTime.slice(1)), 1);
  return onlyFavorites
    ? Pins.queryBackwardByDateFilterByHasFavorite(from, userId, last, pageSize, createdSince)
    : Pins.queryBackwardByDate(from, userId, last, pageSize, createdSince);
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
