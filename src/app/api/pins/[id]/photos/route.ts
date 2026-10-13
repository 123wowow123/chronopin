import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { HttpError, intParam, json, route } from '@/server/http';
import PinPhoto, { PIN_PHOTO_DAILY_LIMIT } from '@/server/model/pinPhoto';
import { savePinPhoto } from '@/server/services/pinPhotos';

type Ctx = RouteContext<'/api/pins/[id]/photos'>;

// The photos readers have added to this pin, newest first. Public; a signed-in
// reader also gets `mine` and `flagged` filled in.
// GET /api/pins/:id/photos
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await getUser(request);
  return json(await PinPhoto.forPin(pinId, user?.id ?? 0));
});

// Adds a photo (multipart: `file`, optional `caption`). Needs a signed-up
// user with a confirmed email address.
// POST /api/pins/:id/photos
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  requireVerifiedEmail(user);
  const pinId = intParam((await ctx.params).id);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || !file.size) throw new HttpError(400, '', { code: 'type', message: 'Choose a photo' });
  const caption = form?.get('caption');
  const problem = PinPhoto.problemWithCaption(caption);
  if (problem) throw new HttpError(400, problem);

  const [pin] = await db.query(`SELECT "id" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (user.role !== 'admin' && (await PinPhoto.countToday(user.id)) >= PIN_PHOTO_DAILY_LIMIT) {
    throw new HttpError(429, `At most ${PIN_PHOTO_DAILY_LIMIT} photos a day.`);
  }
  const stored = await savePinPhoto(user.id, file);
  const photo = await PinPhoto.create({ pinId, userId: user.id, ...stored, caption: typeof caption === 'string' ? caption : null });
  return json(photo, 201);
});
