import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { perfProblem } from '@/lib/pinPerf';
import { deletePerf, perfForPin, savePerf } from '@/server/model/pinPerf';
import { invalidatePin } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/performance'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's hardware performance charts and tables, or 204 when none is recorded.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const perf = await perfForPin(intParam((await ctx.params).id));
  return perf ? json(perf) : noContent();
});

// body { charts?: [{ title, unit, bars: [{ label, value, highlight? }], higherIsBetter?, note?, sourceUrl? }],
//        tables?: [{ title, columns, rows, note?, sourceUrl? }] }. Replaces what the pin has.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const parsed = perfProblem(await readJson(request));
  if (typeof parsed === 'string') throw new HttpError(400, parsed);
  await savePerf(pinId, parsed.charts, parsed.tables);
  invalidatePin(pinId);
  return json(await perfForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deletePerf(pinId);
  invalidatePin(pinId);
  return noContent();
});
