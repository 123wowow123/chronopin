import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { carPerfForPin, carPerfProblem, deleteCarPerf, saveCarPerf } from '@/server/model/pinCarPerf';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/car-performance'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's car performance rubric (src/lib/pinCarPerf.ts), or 204 when it has none.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const perf = await carPerfForPin(intParam((await ctx.params).id));
  return perf ? json(perf) : noContent();
});

// Stores a rubric: body { range, charging, acceleration, assistance, space,
// value (each 0-5 in half steps, or null where the spec is not published; all
// six keys required, at least one score), source ('session' | 'hand'), basis,
// sourceUrl }.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const checked = carPerfProblem(await readJson(request));
  if (typeof checked === 'string') throw new HttpError(400, checked);
  if (!(await saveCarPerf(pinId, checked.scores, checked))) throw new HttpError(409, 'This pin has a car performance rubric set by hand; send source "hand" to replace it.');
  expirePinPage(pinId);
  return json(await carPerfForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteCarPerf(pinId);
  expirePinPage(pinId);
  return noContent();
});
