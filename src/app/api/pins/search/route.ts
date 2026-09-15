import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, publicOrigin, route } from '@/server/http';
import { readSearchRequest, searchPins, searchPinsPage } from '@/server/services/search';

// Every matching pin at once (the map):
// GET /api/pins/search?q=iphone company:Apple&f=watch
//
// A page at a time, with RFC 5988 previous/next links (the search page):
// GET /api/pins/search?q=iphone&sort=date|relevance&created_within=1w&start_past=1mo&start_future=1y
// By date the first page straddles now and pages walk either way; by
// relevance they walk from the best match down. start_past and start_future
// (relevance only) bound when the pins start.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const user = await getUser(request);
  if (!params.has('sort')) {
    return json(
      await searchPins(params.get('q') || '', {
        userId: user?.id,
        onlyWatched: params.get('f')?.toLowerCase() === 'watch',
      }),
    );
  }

  const { pins, links } = await searchPinsPage(readSearchRequest(params, user?.id ?? null));
  const base = publicOrigin(request) + request.nextUrl.pathname;
  const link = Object.entries(links)
    .map(([rel, query]) => `<${base}${query}>; rel="${rel}"`)
    .join(', ');
  return json(pins, 200, link ? { Link: link } : {});
});
