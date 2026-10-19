import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { deletePower, powerForPin, savePower } from '@/server/model/pinPower';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/power'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's capacity in megawatts, or 204 when none is recorded.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const power = await powerForPin(intParam((await ctx.params).id));
  return power ? json(power) : noContent();
});

// body { megawatts, sourceUrl?, note? }: a hand reading, kept over title ones.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const body = await readJson(request);
  const megawatts = Number(body.megawatts);
  if (!(megawatts > 0) || megawatts >= 10_000_000) throw new HttpError(400, 'megawatts must be a positive number (1 GW = 1000).');
  const sourceUrl = typeof body.sourceUrl === 'string' && body.sourceUrl.trim() ? body.sourceUrl.trim() : null;
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) throw new HttpError(400, 'sourceUrl is not a web address.');
  const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 500) : null;
  await savePower(pinId, megawatts, { source: 'hand', sourceUrl, note });
  invalidatePin(pinId);
  return json(await powerForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deletePower(pinId);
  invalidatePin(pinId);
  return noContent();
});
