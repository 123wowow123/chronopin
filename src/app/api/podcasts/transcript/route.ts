import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { fetchPodcastTranscript } from '@/server/scrape/podcast';

// A podcast episode's transcript. GET /api/podcasts/transcript?url=...&lang=en
// url is an Apple Podcasts episode link (…?i=<episode>), or another episode
// page matched to Apple's catalogue by title. The transcript is the
// publisher's own from the show's feed, else the captions of the episode's
// YouTube upload; source says which.
export const GET = route(async (request: NextRequest) => {
  await requireUser(request);
  const params = request.nextUrl.searchParams;
  const url = params.get('url');
  if (!url) {
    throw new HttpError(400, 'url is required');
  }
  return json(await fetchPodcastTranscript(url, params.get('lang') || undefined));
});
