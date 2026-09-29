import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { mapPins } from '@/server/services/mapPins';
import { resolveCreatedSince } from '@/server/util/createdFilter';
import { requestTimeZone } from '@/server/viewer';
import { requestLocale } from '@/lib/i18n/request';
import { localizePins } from '@/server/services/translations';

// Every located pin the map should plot, in one answer.
// GET /api/pins/map?from=ISO&to=ISO&created_within=1w
// GET /api/pins/map?q=iphone company:Apple&f=watch&from=ISO&to=ISO
// from/to bound when the pins start; either may be left out for unbounded.
// The browser resolves them from its own sliders so the boundaries match the
// "now" it plots against.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const user = await getUser(request);
  const onlyWatched = params.get('f')?.toLowerCase() === 'watch';

  const pins = await mapPins({
    from: instant(params.get('from'), 'from'),
    to: instant(params.get('to'), 'to'),
    createdSince: resolveCreatedSince({ created_since: params.get('created_since'), created_within: params.get('created_within') }),
    q: params.get('q') || '',
    onlyWatched: onlyWatched && !!user,
    userId: user?.id ?? null,
    timeZone: requestTimeZone(request),
  });
  return json({ pins: await localizePins(pins, requestLocale(request)) });
});

function instant(value: string | null, name: string) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new HttpError(400, `${name} is not a date: '${value}'`);
  }
  return date;
}
