import { userAgent, type NextRequest } from 'next/server';
import { HttpError, json, noContent, readJson, route } from '@/server/http';
import SearchQueryLog from '@/server/model/searchQueryLog';
import { hasFilters, parseSearchQuery } from '@/server/util/searchQuery';
import { viewerKey } from '@/server/visitor';

// GET  /api/pins/popular-queries   the combined searches run most lately, [string]
// POST { q }                       counts one (ignored unless it combines filters or uses OR; crawlers ignored)
// Every visitor's page asks for this and the answer is a 30-day tally, so one
// read a minute serves them all (it cost a GROUP BY per call, 2026-10-18).
let popular: { at: number; rows: Promise<string[]> } | null = null;
export const GET = route(async () => {
  if (!popular || Date.now() - popular.at > 60_000) {
    const rows = SearchQueryLog.popular(8);
    popular = { at: Date.now(), rows };
    rows.catch(() => {
      if (popular?.rows === rows) popular = null;
    });
  }
  return json(await popular.rows, 200, { 'Cache-Control': 'public, max-age=60' });
});

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
