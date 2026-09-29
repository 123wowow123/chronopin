import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { fetchTranscript } from '@/server/scrape/transcript';

// A YouTube video's transcript. GET /api/youtube/transcript?url=...&lang=en
// (url may also be a bare video id; lang defaults to English, else the first track).
export const GET = route(async (request: NextRequest) => {
  await requireUser(request);
  const params = request.nextUrl.searchParams;
  const url = params.get('url');
  if (!url) {
    throw new HttpError(400, 'url is required');
  }
  return json(await fetchTranscript(url, params.get('lang') || undefined));
});
