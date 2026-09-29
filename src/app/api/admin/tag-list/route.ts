import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getTagList, setTagList } from '@/server/model/appSetting';
import { expireTimeline } from '@/server/services/cache';
import { parseTagList } from '@/lib/tagList';

// Whether the tag panel in the filters lists its tags, or is only the button
// to the big tag cloud (src/lib/tagList.ts).
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getTagList());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseTagList(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setTagList(parsed.setting, admin.id);
  // Read with the cached pages of cards and the map's controls.
  expireTimeline();
  return json(parsed.setting);
});
