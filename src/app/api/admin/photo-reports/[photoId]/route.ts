import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, route } from '@/server/http';
import PinPhoto from '@/server/model/pinPhoto';

type Ctx = RouteContext<'/api/admin/photo-reports/[photoId]'>;

// Dismisses a photo's open flags: an admin looked, and it stays - and one
// hidden after flags shows on its pin again. (Taking it down is the photo's
// own DELETE, which admins may use.)
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const pinId = await PinPhoto.dismiss(intParam((await ctx.params).photoId));
  if (pinId == null) throw new HttpError(404, 'Not Found');
  return json({ dismissed: true, pinId });
});
