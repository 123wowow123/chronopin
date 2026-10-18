import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import config from '@/server/config';
import Medium from '@/server/model/medium';

// Editor.js "image by URL": downloads, stores a thumb and a Medium row.
export const POST = route(async (request: NextRequest) => {
  await requireUser(request);
  const { url } = await readJson(request);
  if (!url) {
    throw new HttpError(500, 'missing url');
  }
  const medium = await Medium.createAndSaveToCDN(url);
  return json({ success: 1, file: { url: config.thumbUrlPrefix + medium.thumbName } });
});
