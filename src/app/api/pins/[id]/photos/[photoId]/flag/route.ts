import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import PinPhoto, { PIN_PHOTO_FLAG_REASONS, type PinPhotoFlagReason } from '@/server/model/pinPhoto';

type Ctx = RouteContext<'/api/pins/[id]/photos/[photoId]/flag'>;

// Flags a photo as a problem. One flag per reader; enough different readers
// hide the photo until an admin reviews it. A reader cannot flag their own.
// POST /api/pins/:id/photos/:photoId/flag {reason, note?}
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const params = await ctx.params;
  const body = await readJson(request);
  if (!PIN_PHOTO_FLAG_REASONS.includes(body.reason)) throw new HttpError(400, 'Unknown reason');
  if (body.note != null && typeof body.note !== 'string') throw new HttpError(400, 'note must be text');
  const result = await PinPhoto.flag(intParam(params.photoId), intParam(params.id), user.id, body.reason as PinPhotoFlagReason, body.note);
  if (!result) throw new HttpError(404, 'Not Found');
  return json({ flagged: true, hidden: result.hidden }, 201);
});
