import type { NextRequest } from 'next/server';
import { HttpError, json, route } from '@/server/http';
import { countDayPins } from '@/server/services/timeline';
import { resolveCreatedSince } from '@/server/util/createdFilter';

const DAY_KEY = /^-?\d{4,6}-\d{2}-\d{2}$/;

function validTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

// How many pins one timeline day has (?day=2026-09-14&tz=America/New_York), as
// { count }: the same pins the timeline would show that day, however little of
// it the loaded pages cover, for a crowded day's "View all" count.
export const GET = route(async (request: NextRequest) => {
  const query = request.nextUrl.searchParams;
  const day = query.get('day') ?? '';
  const timeZone = query.get('tz') || 'UTC';
  if (!DAY_KEY.test(day) || !validTimeZone(timeZone)) {
    throw new HttpError(400, 'Bad Request');
  }
  const createdSince = resolveCreatedSince({
    created_since: query.get('created_since'),
    created_within: query.get('created_within'),
  });
  return json({ count: await countDayPins({ day, timeZone, createdSince }) });
});
