import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import { HttpError, intParam, noContent, route } from '@/server/http';
import PinPhoto from '@/server/model/pinPhoto';

type Ctx = RouteContext<'/api/pins/[id]/photos/[photoId]'>;

// Removes the signed-in reader's own photo (an admin may remove any).
// DELETE /api/pins/:id/photos/:photoId
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const params = await ctx.params;
  const removed = await PinPhoto.remove(intParam(params.photoId), intParam(params.id), user.id, isAdmin(user));
  if (!removed) throw new HttpError(404, 'Not Found');
  return noContent();
});
