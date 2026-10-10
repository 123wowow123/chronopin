import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { candidatesForPin, candidatesProblem, saveCandidates } from '@/server/model/pinCandidate';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/candidates'>;

// Only the pin's author and admins set its contenders.
async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's contenders by category and rank (src/lib/candidates.ts).
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  return json(await candidatesForPin(intParam((await ctx.params).id)));
});

// Replaces the whole list: body [{ category, rank, name, artist?, workPinId?,
// odds?, oddsLabel?, sourceUrl?, asOf? }].
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const rows = candidatesProblem(await readJson(request));
  if (typeof rows === 'string') throw new HttpError(400, rows);
  await saveCandidates(pinId, rows);
  expirePinPage(pinId);
  return json(await candidatesForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await saveCandidates(pinId, []);
  expirePinPage(pinId);
  return noContent();
});
