import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getTimelineAds, setTimelineAds } from '@/server/model/appSetting';
import { expireTimeline } from '@/server/services/cache';
import { parseTimelineAds } from '@/lib/timelineAds';

// Whether the main timeline shows ad blocks.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getTimelineAds());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseTimelineAds(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setTimelineAds(parsed.setting, admin.id);
  // Read with the cached timeline page.
  expireTimeline();
  return json(parsed.setting);
});
