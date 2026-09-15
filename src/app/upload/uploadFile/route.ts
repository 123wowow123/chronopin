import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import config from '@/server/config';
import Medium from '@/server/model/medium';

// Editor.js image uploads (multipart field `image`): stored as a thumb,
// answered in the shape the Editor.js image tool expects.
export const POST = route(async (request: NextRequest) => {
  await requireUser(request);
  const form = await request.formData().catch(() => null);
  const file = form?.get('image');
  if (!(file instanceof File) || !file.size) {
    throw new HttpError(500, 'missing file');
  }
  const medium = await Medium.createAndSaveToCDNFromBuffer(Buffer.from(await file.arrayBuffer()));
  return json({ success: 1, file: { url: config.thumbUrlPrefix + medium.thumbName } });
});
