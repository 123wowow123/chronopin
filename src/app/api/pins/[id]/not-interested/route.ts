import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, noContent, route } from '@/server/http';
import PinNotInterested from '@/server/model/pinNotInterested';

type Ctx = RouteContext<'/api/pins/[id]/not-interested'>;

// Marks the pin "Not interested" for the signed-in reader (0077): it leaves
// their timeline, search and "More like this".
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  const result = await PinNotInterested.mark(user.id, pinId);
  if (!result) throw new HttpError(404, 'Pin not found');
  return json({ pinId, notInterested: true }, result.changed ? 201 : 200);
});

// Takes it back: the pin shows again.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  await PinNotInterested.unmark(user.id, intParam((await ctx.params).id));
  return noContent();
});
