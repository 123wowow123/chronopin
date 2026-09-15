import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, route } from '@/server/http';
import { searchPageCategoryCounts, timelineCategoryCounts } from '@/server/services/pages';
import { resolveCreatedSince } from '@/server/util/createdFilter';

// Pins per lowercased category, for the category filter's pills.
// GET /api/pins/category-counts?created_within=1w                   the timeline
// GET /api/pins/category-counts?q=iphone category:Phones&f=watch    a search (its category: terms are ignored)
// Either takes created_since=ISO in place of created_within.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const created = { created_since: params.get('created_since'), created_within: params.get('created_within') };
  // Rejects a cutoff it cannot read with a 400 before anything is cached.
  resolveCreatedSince(created);

  if (!params.has('q')) {
    return json(await timelineCategoryCounts(created));
  }
  const user = await getUser(request);
  const onlyWatched = params.get('f')?.toLowerCase() === 'watch';
  return json(await searchPageCategoryCounts(params.get('q') || '', user?.id ?? null, onlyWatched && !!user, created));
});
