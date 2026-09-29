import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, noContent, route } from '@/server/http';
import User from '@/server/model/user';
import UserBlock from '@/server/model/userBlock';

type Ctx = RouteContext<'/api/users/[id]/block'>;

// The user to block, as a positive integer id that belongs to a live user.
async function target(ctx: Ctx): Promise<number> {
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

// Blocks a user (0076). Signing in is enough; nobody blocks themselves.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const blocker = await requireUser(request);
  const userId = await target(ctx);
  if (userId === blocker.id) {
    throw new HttpError(400, '', { message: 'you cannot block yourself' });
  }
  const { changed } = await UserBlock.block(blocker.id, userId);
  return json({ userId, blocked: true }, changed ? 201 : 200);
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const blocker = await requireUser(request);
  await UserBlock.unblock(blocker.id, await target(ctx));
  return noContent();
});
