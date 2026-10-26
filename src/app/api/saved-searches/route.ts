import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import { HttpError, json, noContent, readJson, route } from '@/server/http';
import SavedSearch from '@/server/model/savedSearch';
import { parseSearchQuery } from '@/server/util/searchQuery';

// GET /api/saved-searches              every named search, { [query]: { name, by } } (public: shown in everyone's popular searches)
// GET /api/saved-searches?suggest=q    { name } generated for a pin: list (null for other searches)
// PUT { q, name }                      names a search; an empty name removes it
export const GET = route(async (request: NextRequest) => {
  const suggest = request.nextUrl.searchParams.get('suggest');
  if (suggest !== null) {
    await requireUser(request);
    const ids = parseSearchQuery(suggest.slice(0, 2000)).ids;
    return json({ name: ids.length ? await SavedSearch.suggest(ids.slice(0, 500)) : null });
  }
  return json(await SavedSearch.list());
});

export const PUT = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { q, name } = await readJson<{ q?: unknown; name?: unknown }>(request);
  if (typeof q !== 'string' || typeof name !== 'string' || !q.trim() || q.length > 2000) throw new HttpError(400, 'Bad Request');
  const done = await SavedSearch.set(user.id, isAdmin(user), q.trim().replace(/\s+/g, ' '), name.trim().replace(/\s+/g, ' ').slice(0, 60));
  if (!done) throw new HttpError(403, 'Forbidden');
  return noContent();
});
