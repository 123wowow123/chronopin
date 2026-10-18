import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import Follow, { FOLLOWING_PAGE_SIZE } from '@/server/model/follow';

// Who the caller follows, a page at a time, for the profile page's Following
// section: ?after= the previous page's `next`, ?q= a handle filter. Not a
// public lookup: :id must be the caller's own.
export const GET = route(async (request: NextRequest, ctx: RouteContext<'/api/users/[id]/following'>) => {
  const user = await requireUser(request);
  if (Number((await ctx.params).id) !== user.id) {
    throw new HttpError(403, '', { message: 'you can only view your own following list' });
  }
  const params = request.nextUrl.searchParams;
  const after = Number(params.get('after'));
  const limit = Number(params.get('limit'));
  return json(
    await Follow.listFollowing(user.id, {
      after: Number.isInteger(after) && after > 0 ? after : null,
      limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : FOLLOWING_PAGE_SIZE,
      q: params.get('q'),
    }),
  );
});
