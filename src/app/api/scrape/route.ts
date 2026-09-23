import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { NOTE_MAX } from '@/server/extract';
import { HttpError, json, readJson, route } from '@/server/http';
import { scrape } from '@/server/scrape';

// A draft pin read from a web page, tweet or video. GET /api/scrape?url=...
// or, with what the person pinning it says about it (which event, what
// matters), POST /api/scrape {url, note}.
// The reference search alone can take a few minutes (src/server/extract/references.ts).
export const maxDuration = 360;

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

export const POST = route(async (request: NextRequest) => {
  // The quick pin form's first step: refused before it spends a model call.
  requireVerifiedEmail(await requireUser(request));
  const { url, note } = await readJson(request);
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
    throw new HttpError(400, 'url must be an http(s) link');
  }
  if (note != null && (typeof note !== 'string' || note.length > NOTE_MAX)) {
    throw new HttpError(400, `note must be text of at most ${NOTE_MAX} characters`);
  }
  try {
    return json(await scrape(url.trim(), { note: note?.trim() || undefined }));
  } catch (err) {
    return json(err instanceof Error ? { err: err.message } : err, 500);
  }
});
