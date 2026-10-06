import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getWebOverlay, setWebOverlay } from '@/server/model/appSetting';
import { expireTimeline } from '@/server/services/cache';
import { parseWebOverlay } from '@/lib/webOverlay';

// Whether the map offers its web of related-pin lines and graph.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getWebOverlay());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseWebOverlay(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setWebOverlay(parsed.setting, admin.id);
  // Read with the cached pages of cards and the map's controls.
  expireTimeline();
  return json(parsed.setting);
});
