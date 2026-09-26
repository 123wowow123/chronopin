import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, paginationHeaders, paginationLink, route } from '@/server/http';
import { getTimeline } from '@/server/services/timeline';
import { linkParams, resolveCreatedSince } from '@/server/util/createdFilter';
import { nearLinkParams, resolveNear } from '@/server/util/nearFilter';
import { requestLocale } from '@/lib/i18n/request';
import { toJson, type PinJson } from '@/lib/types';
import { localizePins } from '@/server/services/translations';

// A page of the timeline with the date markers inside it.
export const GET = route(async (request: NextRequest) => {
  const query = request.nextUrl.searchParams;
  const user = await getUser(request);
  const createdSince = resolveCreatedSince({
    created_since: query.get('created_since'),
    created_within: query.get('created_within'),
  });

  // Where the viewer is and how far out they want to look. The browser sends
  // both, and both ride back out on the links so later pages keep the ring.
  const near = resolveNear({ near: query.get('near'), within: query.get('within') });

  // ?around=<ISO instant>: the first page centred there rather than on now
  // (a timeline opened on a day from its URL's hash).
  const aroundAt = query.get('around');
  const around = aroundAt && !Number.isNaN(Date.parse(aroundAt)) ? { dateTime: aroundAt, pinId: 0 } : null;

  const pins = await getTimeline({
    userId: user?.id ?? 0,
    fromDateTime: query.get('from_date_time'),
    around,
    lastPinId: Number(query.get('last_pin_id')) || 0,
    onlyFavorites: !!query.get('hasFavorite'),
    createdSince,
    near,
  });

  const link = paginationLink(request, pins, { ...linkParams(createdSince), ...nearLinkParams(near) });
  // In the page's language (?lang=), like the server-rendered first page.
  const body = toJson<{ pins: PinJson[] }>(pins);
  await localizePins(body.pins, requestLocale(request));
  return json(body, 200, paginationHeaders(link, pins.queryCount));
});
