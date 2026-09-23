import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Pin from '@/server/model/pin';
import PinRevisit from '@/server/model/pinRevisit';

type Ctx = RouteContext<'/api/pins/[id]/revisit'>;

// A pin's open revisit mark (schema 0067): the midnight job works these
// (docs/okf/scraping/daily-jobs.md#revisits). Admin only.

// GET /api/pins/:id/revisit - the open mark, or null.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  return json(await PinRevisit.openFor(intParam((await ctx.params).id)));
});

// POST /api/pins/:id/revisit { reason } - marks it, or adds to its open mark.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const admin = await requireRole('admin', request);
  const pinId = intParam((await ctx.params).id);
  const { reason } = await readJson<Record<string, unknown>>(request);
  if (typeof reason !== 'string' || !reason.trim() || reason.length > 1000) {
    throw new HttpError(400, '', { message: 'reason must be text of 1 to 1000 characters' });
  }
  const { pin } = await Pin.queryById(pinId);
  if (!pin) throw new HttpError(404, 'Not Found');
  await PinRevisit.mark(pinId, reason, { userId: admin.id });
  return json(await PinRevisit.openFor(pinId), 201);
});

// DELETE /api/pins/:id/revisit { resolution? } - closes the open mark.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const pinId = intParam((await ctx.params).id);
  const body = await readJson<Record<string, unknown>>(request).catch(() => ({}) as Record<string, unknown>);
  const resolution = typeof body.resolution === 'string' && body.resolution.trim() ? body.resolution : 'Resolved by an admin.';
  if (!(await PinRevisit.resolve(pinId, resolution))) throw new HttpError(404, '', { message: 'This pin has no open revisit mark' });
  return json(null);
});
