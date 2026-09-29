import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, publicOrigin, route } from '@/server/http';
import { readSearchRequest, searchPins, searchPinsPage } from '@/server/services/search';
import { requestTimeZone } from '@/server/viewer';
import { requestLocale } from '@/lib/i18n/request';
import { toJson, type PinJson } from '@/lib/types';
import { localizePins } from '@/server/services/translations';

// Every matching pin at once (the map):
// GET /api/pins/search?q=iphone company:Apple&f=watch
//
// A page at a time, with RFC 5988 previous/next links (the search page):
// GET /api/pins/search?q=iphone&sort=date|relevance&created_within=1w&start_past=1mo&start_future=1y
// By date the first page straddles now and pages walk either way; by
// relevance they walk from the best match down. start_past and start_future
// (relevance only) bound when the pins start.
export const GET = route(async (request: NextRequest) => {
  // date: and posted: days are the viewer's own: in the zone a page's links
  // carry on (tz), else the one the tz cookie names.
  const params = new URLSearchParams(request.nextUrl.searchParams);
  if (!params.has('tz')) params.set('tz', requestTimeZone(request));
  const user = await getUser(request);
  const locale = requestLocale(request);
  if (!params.has('sort')) {
    const all = toJson<{ pins: PinJson[] }>(
      await searchPins(params.get('q') || '', {
        userId: user?.id,
        onlyWatched: params.get('f')?.toLowerCase() === 'watch',
        timeZone: params.get('tz')!,
      }),
    );
    await localizePins(all.pins ?? [], locale);
    return json(all);
  }

  const page = await searchPinsPage(readSearchRequest(params, user?.id ?? null));
  const links = page.links;
  const pins = toJson<{ pins: PinJson[] }>(page.pins);
  await localizePins(pins.pins, locale);
  const base = publicOrigin(request) + request.nextUrl.pathname;
  const link = Object.entries(links)
    .map(([rel, query]) => `<${base}${query}>; rel="${rel}"`)
    .join(', ');
  return json(pins, 200, link ? { Link: link } : {});
});
