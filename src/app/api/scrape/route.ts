import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { scrape } from '@/server/scrape';

// A draft pin read from a web page, tweet or video. GET /api/scrape?url=...
export const maxDuration = 120;

export const GET = route(async (request: NextRequest) => {
  await requireUser(request);
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    throw new HttpError(400, 'url is required');
  }
  try {
    return json(await scrape(url));
  } catch (err) {
    return json(err instanceof Error ? { err: err.message } : err, 500);
  }
});
