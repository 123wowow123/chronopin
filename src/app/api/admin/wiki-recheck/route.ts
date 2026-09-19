import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { getWikiRecheck, setWikiRecheck } from '@/server/model/appSetting';
import { parseWikiRecheck } from '@/lib/wikiRecheck';

// When okf:lint reads pins' links again to catch stale wikis: after how many
// days (null = never), and whether only for pins viewed since.
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await getWikiRecheck());
});

export const PUT = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const parsed = parseWikiRecheck(await readJson(request));
  if ('problem' in parsed) {
    throw new HttpError(400, '', { message: parsed.problem });
  }
  await setWikiRecheck(parsed.setting, admin.id);
  return json(parsed.setting);
});
