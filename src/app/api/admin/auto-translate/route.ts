import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getAutoTranslate, setAutoTranslate } from '@/server/model/appSetting';
import { parseAutoTranslate } from '@/lib/autoTranslate';

// Whether new and edited pins are translated automatically (src/lib/autoTranslate.ts).
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getAutoTranslate());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseAutoTranslate(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setAutoTranslate(parsed.setting, admin.id);
  return json(parsed.setting);
});
