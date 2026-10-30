import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, noContent, route } from '@/server/http';
import MoveAlert from '@/server/model/moveAlert';

type Ctx = RouteContext<'/api/move-alerts/[id]'>;

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  if (!(await MoveAlert.remove(user.id, intParam((await ctx.params).id)))) throw new HttpError(404, 'Not Found');
  return noContent();
});
