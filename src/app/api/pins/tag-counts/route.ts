import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, route } from '@/server/http';
import { searchPageTagCounts, TAG_CLOUD_MAX, TAG_CLOUD_SIZE, timelineTagCounts } from '@/server/services/pages';
import { resolveCreatedSince } from '@/server/util/createdFilter';
import { requestTimeZone } from '@/server/viewer';
import { requestLocale } from '@/lib/i18n/request';

// The tag cloud's tags, [{ name, kind, count }], busiest first, the site's
// own reserved filters (kind 'reserved') first of all - they stand outside
// `limit`, so the cloud offers the same few whatever else is busy today.
// GET /api/pins/tag-counts?created_within=1w                    the timeline
// GET /api/pins/tag-counts?q=anime tag:Artemis&f=watch          a search (the terms the cloud writes are ignored)
// Either takes created_since=ISO in place of created_within, and limit=N
// (default 60, at most 200) for how many tags.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const created = { created_since: params.get('created_since'), created_within: params.get('created_within') };
  // Rejects a cutoff it cannot read with a 400 before anything is cached.
  resolveCreatedSince(created);
  const asked = Number.parseInt(params.get('limit') || '', 10);
  const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), TAG_CLOUD_MAX) : TAG_CLOUD_SIZE;

  if (!params.has('q')) {
    return json(await timelineTagCounts(created, limit));
  }
  const user = await getUser(request);
  const onlyWatched = params.get('f')?.toLowerCase() === 'watch';
  return json(await searchPageTagCounts(params.get('q') || '', user?.id ?? null, onlyWatched && !!user, created, requestTimeZone(request), limit, requestLocale(request)));
});
