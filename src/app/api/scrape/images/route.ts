import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import { picturesNeeded } from '@/lib/mediaTarget';
import { findPinImages } from '@/server/scrape/findImages';

// Pictures for a pin the author is about to post, found the way a scrape
// tops up a page with too few (src/server/scrape/findImages.ts): the
// company's announcement (also returned as a reference), the day's articles,
// Wikipedia. Used for each entry of a release-notes page.
//   GET /api/scrape/images?title=...&company=...&start=YYYY-MM-DD&have=1&images=1&skip=<picture url>
// have is how many media (of any kind) the pin has, images how many of them are
// pictures (default: all of them); enough are found to reach three media with
// at least one picture.
export const maxDuration = 60;

export const GET = route(async (request: NextRequest) => {
  await requireUser(request);
  const params = request.nextUrl.searchParams;
  const title = params.get('title')?.trim();
  if (!title) {
    throw new HttpError(400, 'title is required');
  }
  const start = params.get('start') || undefined;
  const have = Math.max(0, Number(params.get('have')) || 0);
  const haveImages = params.has('images') ? Math.max(0, Number(params.get('images')) || 0) : have;
  const found = await findPinImages(
    {
      title,
      company: params.get('company'),
      companyWikiUrl: params.get('companyWikiUrl'),
      utcStartDateTime: start,
    },
    picturesNeeded(have, haveImages),
    params.getAll('skip'),
  );
  return json(found);
});
