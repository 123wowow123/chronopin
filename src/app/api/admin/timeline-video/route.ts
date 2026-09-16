import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getTimelineVideo, setTimelineVideo } from '@/server/model/appSetting';
import { expireTimeline } from '@/server/services/cache';
import { parseTimelineVideo } from '@/lib/timelineVideo';

// Whether a card on the timeline plays video on a phone.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getTimelineVideo());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseTimelineVideo(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setTimelineVideo(parsed.setting, admin.id);
  // The setting rides along on every cached timeline and search page.
  expireTimeline();
  return json(parsed.setting);
});
