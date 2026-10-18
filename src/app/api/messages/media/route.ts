import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { HttpError, json, route } from '@/server/http';
import { saveMessagePhoto } from '@/server/services/messages';

// One photo for a message being written (multipart field `file`): pasted
// into the composer, dropped on the chat or picked with its photo button.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  requireVerifiedEmail(user);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File) || !file.size) throw new HttpError(400, '', { code: 'type', message: 'Choose a photo' });
  return json({ name: await saveMessagePhoto(user.id, file) }, 201);
});
