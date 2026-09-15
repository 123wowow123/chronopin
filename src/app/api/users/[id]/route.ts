import type { NextRequest } from 'next/server';
import { requireRole, requireUser } from '@/server/auth';
import { HttpError, intParam, json, noContent, route } from '@/server/http';
import User from '@/server/model/user';

type Ctx = RouteContext<'/api/users/[id]'>;

// A user's public profile. (The Express route answered with an empty body:
// it read a `profile` property the model never had.)
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  await requireUser(request);
  const { user } = await User.getById(intParam((await ctx.params).id));
  if (!user) {
    throw new HttpError(404, 'Not Found');
  }
  return json(new User(user.pick(['id', 'userName', 'firstName', 'lastName', 'pictureUrl', 'about', 'websiteUrl'])));
});

// Soft-deletes a user (admin only).
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  await new User({ id: intParam((await ctx.params).id) }).delete();
  return noContent();
});
