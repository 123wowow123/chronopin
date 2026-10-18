import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, noContent, route } from '@/server/http';
import { removePicture, setPicture } from '@/server/services/users';

// Replace the signed-in user's picture with an uploaded image (multipart
// field `picture`).
export const PUT = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const form = await request.formData().catch(() => null);
  const file = form?.get('picture');
  if (!(file instanceof File) || !file.size) {
    throw new HttpError(400, 'Choose an image to upload', { message: 'Choose an image to upload' });
  }
  return json({ pictureUrl: await setPicture(user.id, file) });
});

export const DELETE = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  await removePicture(user.id);
  return noContent();
});
