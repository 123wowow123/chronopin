import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getSiteVerification, setSiteVerification } from '@/server/model/appSetting';
import { TAGS } from '@/server/services/cache';
import { parseSiteVerification } from '@/lib/siteVerification';

// A site-ownership meta tag's name and code (src/lib/siteVerification.ts).
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getSiteVerification());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseSiteVerification(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setSiteVerification(parsed.setting, admin.id);
  revalidateTag(TAGS.siteVerification, { expire: 0 });
  return json(parsed.setting);
});
