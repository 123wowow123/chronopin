import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import Follow from '@/server/model/follow';
import User from '@/server/model/user';
import UserBlock from '@/server/model/userBlock';

type Ctx = RouteContext<'/api/users/[id]/follow'>;

// The followee as a positive integer id that belongs to a live user.
async function followee(ctx: Ctx): Promise<number> {
  const userId = Number((await ctx.params).id);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new HttpError(400, '', { message: 'user id must be a positive integer' });
  }
  const { user } = await User.getById(userId);
  if (!user) {
    throw new HttpError(404, 'Not Found');
  }
  return userId;
}

// Every answer is the followed user's status as the caller now sees it, so
// the client can redraw the button and counts from one response.
async function status(userId: number, viewerId: number | null, statusCode = 200) {
  return json({ userId, ...(await Follow.status(userId, viewerId)) }, statusCode);
}

// Follow counts for a user, and whether the caller follows them.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await getUser(request);
  return status(await followee(ctx), viewer?.id ?? null);
});

export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const follower = await requireUser(request);
  const userId = await followee(ctx);
  if (userId === follower.id) {
    throw new HttpError(400, '', { message: 'you cannot follow yourself' });
  }
  // Blocking ended any follow between them; it does not start again.
  if (await UserBlock.between(follower.id, userId)) {
    throw new HttpError(403, '', { code: 'blocked', message: 'you cannot follow this user' });
  }
  const { changed } = await Follow.follow(follower.id, userId);
  return status(userId, follower.id, changed ? 201 : 200);
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const follower = await requireUser(request);
  const userId = await followee(ctx);
  await Follow.unfollow(follower.id, userId);
  return status(userId, follower.id);
});
