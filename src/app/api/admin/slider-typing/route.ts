import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getSliderTyping, setSliderTyping } from '@/server/model/appSetting';
import { expireTimeline } from '@/server/services/cache';
import { parseSliderTyping } from '@/lib/sliderTyping';

// Whether the filter sliders offer a typed box and preset chips under the track.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getSliderTyping());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseSliderTyping(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setSliderTyping(parsed.setting, admin.id);
  // Read with the cached pages of cards and the map's controls.
  expireTimeline();
  return json(parsed.setting);
});
