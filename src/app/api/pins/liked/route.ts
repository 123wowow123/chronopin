import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import Like from '@/server/model/like';

const MAX_IDS = 500;

// Which of these pins the signed-in viewer likes.
// GET /api/pins/liked?ids=1,2,3  ->  { liked: [2] }
// Like /api/pins/watched: a cached page of cards carries no viewer's state.
export const GET = route(async (request: NextRequest) => {
  const ids = (request.nextUrl.searchParams.get('ids') || '')
    .split(',')
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);
  if (ids.length > MAX_IDS) {
    throw new HttpError(400, `ids names more than ${MAX_IDS} pins`);
  }
  const user = await getUser(request);
  return json({ liked: user ? await Like.likedAmong(user.id, ids) : [] });
});
