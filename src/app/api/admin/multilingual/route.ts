import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getMultilingual, setMultilingual } from '@/server/model/appSetting';
import { setMultilingualEnabled } from '@/server/services/cache';
import { parseMultilingual } from '@/lib/multilingual';

// Whether the site is offered in its other languages (src/lib/multilingual.ts).
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getMultilingual());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseMultilingual(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setMultilingual(parsed.setting, admin.id);
  setMultilingualEnabled(parsed.setting.enabled);
  return json(parsed.setting);
});
