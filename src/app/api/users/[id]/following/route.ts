import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import Follow from '@/server/model/follow';

// Who the caller follows, for the "manage following" page. Not a public
// lookup: :id must be the caller's own.
export const GET = route(async (request: NextRequest, ctx: RouteContext<'/api/users/[id]/following'>) => {
  const user = await requireUser(request);
  if (Number((await ctx.params).id) !== user.id) {
    throw new HttpError(403, '', { message: 'you can only view your own following list' });
  }
  return json(await Follow.listFollowing(user.id));
});
