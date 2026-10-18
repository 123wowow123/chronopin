import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import Favorite from '@/server/model/favorite';

// The most pins one request may ask about: a page of the timeline is well
// inside this, and a request naming more is a mistake rather than a page.
const MAX_IDS = 500;

// Which of these pins the signed-in viewer watches.
// GET /api/pins/watched?ids=1,2,3  ->  { watched: [2] }
//
// A server-rendered page of cards is cached once for everyone, so it carries
// no viewer's watch state; the browser asks for the page's pins in one go
// instead of the page being built, and cached, per person.
export const GET = route(async (request: NextRequest) => {
  const ids = (request.nextUrl.searchParams.get('ids') || '')
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length > MAX_IDS) {
    throw new HttpError(400, `ids names more than ${MAX_IDS} pins`);
  }
  // A signed-out reader watches nothing, and is told so without a query.
  const user = await getUser(request);
  return json({ watched: user ? await Favorite.watchedAmong(user.id, ids) : [] });
});
