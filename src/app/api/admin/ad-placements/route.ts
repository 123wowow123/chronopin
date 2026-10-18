import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getAdPlacements, setAdPlacements } from '@/server/model/appSetting';
import { expireTimeline } from '@/server/services/cache';
import { parseAdPlacements } from '@/lib/adPlacements';

// Which ad placements show their ads.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getAdPlacements());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseAdPlacements(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setAdPlacements(parsed.setting, admin.id);
  // Read with the cached timeline page and the pin pages.
  expireTimeline();
  return json(parsed.setting);
});
