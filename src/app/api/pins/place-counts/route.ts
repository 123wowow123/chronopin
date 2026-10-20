import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import { TAG_CLOUD_MAX, timelinePlaceCounts } from '@/server/services/pages';
import { resolveCreatedSince } from '@/server/util/createdFilter';

// The tag cloud's map view: the places the timeline's pins stand in, read off
// their addresses, [{ name, country, count }], busiest first.
// GET /api/pins/place-counts?kind=country&created_within=1w
// kind is country (default) or city (country says which one); limit=N, at most 200.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const created = { created_since: params.get('created_since'), created_within: params.get('created_within') };
  resolveCreatedSince(created);
  const kind = params.get('kind') === 'city' ? 'city' : 'country';
  const asked = Number.parseInt(params.get('limit') || '', 10);
  const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), TAG_CLOUD_MAX) : TAG_CLOUD_MAX;
  return json(await timelinePlaceCounts(kind, created, limit));
});
