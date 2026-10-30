import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import SearchAlert from '@/server/model/searchAlert';

type Ctx = RouteContext<'/api/search-alerts/[id]'>;

export const PATCH = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const body = await readJson<{ label?: unknown; notifyBell?: unknown; notifyDigest?: unknown }>(request);
  if (
    (body.label != null && typeof body.label !== 'string') ||
    (body.notifyBell !== undefined && typeof body.notifyBell !== 'boolean') ||
    (body.notifyDigest !== undefined && typeof body.notifyDigest !== 'boolean')
  ) {
    throw new HttpError(400, 'Bad Request');
  }
  const saved = await SearchAlert.update(user.id, intParam((await ctx.params).id), {
    label: body.label === undefined ? undefined : (body.label as string | null),
    notifyBell: body.notifyBell as boolean | undefined,
    notifyDigest: body.notifyDigest as boolean | undefined,
  });
  if (!saved) throw new HttpError(404, 'Not Found');
  return json(saved);
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  if (!(await SearchAlert.remove(user.id, intParam((await ctx.params).id)))) throw new HttpError(404, 'Not Found');
  return noContent();
});
