import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { HttpError, json, route } from '@/server/http';
import { saveListingMedia } from '@/server/services/listings';

// One photo or video for a listing being written (multipart field `file`),
// stored at once so the form can show it; the listing names it on save.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  requireVerifiedEmail(user);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || !file.size) throw new HttpError(400, '', { code: 'type', message: 'Choose a photo or a video' });
  return json(await saveListingMedia(user.id, file), 201);
});
