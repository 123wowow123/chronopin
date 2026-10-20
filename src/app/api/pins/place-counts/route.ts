import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import { TAG_CLOUD_MAX, timelinePlaceCounts } from '@/server/services/pages';
import { resolveCreatedSince } from '@/server/util/createdFilter';

// The tag cloud's map view: the places the timeline's pins stand in, read off
// their addresses, { country: [...], city: [...] }, each [{ name, country, count, lat, lon }] busiest first
// (lat and lon the median of the places' pins).
// GET /api/pins/place-counts?created_within=1w&limit=200
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const created = { created_since: params.get('created_since'), created_within: params.get('created_within') };
  resolveCreatedSince(created);
  const asked = Number.parseInt(params.get('limit') || '', 10);
  const limit = Number.isFinite(asked) ? Math.min(Math.max(asked, 1), TAG_CLOUD_MAX) : TAG_CLOUD_MAX;
  return json(await timelinePlaceCounts(created, limit));
});
