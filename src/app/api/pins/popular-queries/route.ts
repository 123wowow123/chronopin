import { userAgent, type NextRequest } from 'next/server';
import { HttpError, json, noContent, readJson, route } from '@/server/http';
import SearchQueryLog from '@/server/model/searchQueryLog';
import { hasFilters, parseSearchQuery } from '@/server/util/searchQuery';
import { viewerKey } from '@/server/visitor';

// GET  /api/pins/popular-queries   the combined searches run most lately, [string]
// POST { q }                       counts one (ignored unless it combines filters or uses OR; crawlers ignored)
export const GET = route(async () => json(await SearchQueryLog.popular(8)));

export const POST = route(async (request: NextRequest) => {
  const { q } = await readJson<{ q?: unknown }>(request);
  if (typeof q !== 'string' || q.length > 300) throw new HttpError(400, 'Bad Request');
  const query = q.trim().replace(/\s+/g, ' ');
  const parsed = parseSearchQuery(query);
  const combo = !!parsed.alternatives || (hasFilters(parsed) && query.split(' ').length >= 2);
  if (!combo || userAgent(request).isBot) return noContent();
  await SearchQueryLog.record(query, await viewerKey(request));
  return noContent();
});
