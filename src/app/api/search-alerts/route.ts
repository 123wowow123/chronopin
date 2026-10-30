import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { MAX_QUERY_LENGTH, MAX_SEARCH_ALERTS, normalizeQuery } from '@/lib/searchAlerts';
import SearchAlert from '@/server/model/searchAlert';

// Saved searches with alerts (0237).
//
// GET  /api/search-alerts[?q=]   { searches } - the reader's own; with q, just the one for that query
// POST { query, label?, notifyBell?, notifyDigest? }   saves a search, or updates the one the reader has for this query
// PATCH /api/search-alerts/:id   { label?, notifyBell?, notifyDigest? }
// DELETE /api/search-alerts/:id
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const q = request.nextUrl.searchParams.get('q');
  if (q != null) {
    const found = await SearchAlert.findByQuery(user.id, q);
    return json({ searches: found ? [found] : [] });
  }
  return json({ searches: await SearchAlert.list(user.id) });
});

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const body = await readJson<{ query?: unknown; label?: unknown; notifyBell?: unknown; notifyDigest?: unknown }>(request);
  const query = typeof body.query === 'string' ? normalizeQuery(body.query) : '';
  if (!query || query.length > MAX_QUERY_LENGTH) throw new HttpError(400, 'Bad Request');
  if (body.label != null && typeof body.label !== 'string') throw new HttpError(400, 'Bad Request');
  if (!(await SearchAlert.findByQuery(user.id, query)) && (await SearchAlert.count(user.id)) >= MAX_SEARCH_ALERTS) {
    throw new HttpError(409, `You can save up to ${MAX_SEARCH_ALERTS} searches.`);
  }
  const saved = await SearchAlert.save(user.id, {
    query,
    label: (body.label as string | null | undefined) ?? null,
    notifyBell: body.notifyBell !== false,
    notifyDigest: body.notifyDigest !== false,
  });
  return json(saved, 201);
});
