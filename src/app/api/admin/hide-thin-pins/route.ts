import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getHideThinPins, setHideThinPins } from '@/server/model/appSetting';
import { expireSearchIndex } from '@/server/services/cache';
import { parseHideThinPins } from '@/lib/searchQuality';

// Whether thin pins ask search engines not to index them (/admin/search).
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getHideThinPins());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseHideThinPins(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setHideThinPins(parsed.setting, admin.id);
  // Every pin page's robots tag and the sitemap read it.
  expireSearchIndex();
  return json(parsed.setting);
});
