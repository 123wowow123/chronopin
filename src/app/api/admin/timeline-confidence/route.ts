import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getTimelineConfidence, setTimelineConfidence } from '@/server/model/appSetting';
import { expireTimeline } from '@/server/services/cache';
import { parseTimelineConfidence } from '@/lib/timelineConfidence';

// Whether the home timeline hides low-confidence pins, and below what score.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getTimelineConfidence());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseTimelineConfidence(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setTimelineConfidence(parsed.setting, admin.id);
  expireTimeline();
  return json(parsed.setting);
});
