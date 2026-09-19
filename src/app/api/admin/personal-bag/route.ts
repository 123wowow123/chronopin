import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getPersonalBag, setPersonalBag } from '@/server/model/appSetting';
import { parsePersonalBag } from '@/lib/userWiki';

// Whether the timeline weighs a crowded day's cards by the viewer's
// preference wiki. The home page reads it per request, so nothing to expire.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getPersonalBag());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parsePersonalBag(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setPersonalBag(parsed.setting, admin.id);
  return json(parsed.setting);
});
