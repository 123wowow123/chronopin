import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getTimelineVideo, setTimelineVideo } from '@/server/model/appSetting';
import { expireTimeline } from '@/server/services/cache';
import { parseTimelineVideo } from '@/lib/timelineVideo';

// Whether a pin card plays video, on a phone and on a wider screen.
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
  // The setting rides along on every cached page of cards.
  expireTimeline();
  return json(parsed.setting);
});
