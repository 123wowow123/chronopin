import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, paginationHeaders, paginationLink, route } from '@/server/http';
import { getTimeline } from '@/server/services/timeline';
import { linkParams, resolveCreatedSince } from '@/server/util/createdFilter';

// A page of the timeline with the date markers inside it.
export const GET = route(async (request: NextRequest) => {
  const query = request.nextUrl.searchParams;
  const user = await getUser(request);
  const createdSince = resolveCreatedSince({
    created_since: query.get('created_since'),
    created_within: query.get('created_within'),
  });

  const pins = await getTimeline({
    userId: user?.id ?? 0,
    fromDateTime: query.get('from_date_time'),
    lastPinId: Number(query.get('last_pin_id')) || 0,
    onlyFavorites: !!query.get('hasFavorite'),
    createdSince,
  });

  const link = paginationLink(request, pins, linkParams(createdSince));
  return json(pins, 200, paginationHeaders(link, pins.queryCount));
});
