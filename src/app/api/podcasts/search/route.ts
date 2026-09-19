import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { searchEpisodes } from '@/server/scrape/podcast';

// Podcast episodes on Apple Podcasts matching a term.
// GET /api/podcasts/search?q=...&limit=25 (limit at most 200)
export const GET = route(async (request: NextRequest) => {
  await requireUser(request);
  const params = request.nextUrl.searchParams;
  const q = params.get('q')?.trim();
  if (!q) {
    throw new HttpError(400, 'q is required');
  }
  const limit = Math.min(200, Math.max(1, Number(params.get('limit')) || 25));
  return json(await searchEpisodes(q, { limit }));
});
