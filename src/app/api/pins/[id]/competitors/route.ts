import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { competitorsForPin, competitorsProblem, saveCompetitors } from '@/server/model/pinCompetitor';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/competitors'>;

// Only the pin's author and admins set its competitors.
async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's competing products by rank (src/lib/competitors.ts).
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  return json(await competitorsForPin(intParam((await ctx.params).id)));
});

// Replaces the whole list: body [{ rank, name, maker?, competitorPinId?,
// summary?, sourceUrl? }].
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const rows = competitorsProblem(await readJson(request));
  if (typeof rows === 'string') throw new HttpError(400, rows);
  await saveCompetitors(pinId, rows);
  expirePinPage(pinId);
  return json(await competitorsForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await saveCompetitors(pinId, []);
  expirePinPage(pinId);
  return noContent();
});
