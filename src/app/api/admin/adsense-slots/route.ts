import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getAdsenseSlots, setAdsenseSlots } from '@/server/model/appSetting';
import { expireTimeline } from '@/server/services/cache';
import { parseAdsenseSlots } from '@/lib/adsense';

// The AdSense ad unit each placement shows instead of its Amazon ads.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getAdsenseSlots());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseAdsenseSlots(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setAdsenseSlots(parsed.setting, admin.id);
  // Read with the cached timeline page.
  expireTimeline();
  return json(parsed.setting);
});
