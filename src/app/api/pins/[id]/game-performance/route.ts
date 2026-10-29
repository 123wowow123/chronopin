import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { gamePerfForPin, gamePerfProblem, deleteGamePerf, saveGamePerf } from '@/server/model/pinGamePerf';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/game-performance'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's video game rubric (src/lib/pinGamePerf.ts), or 204 when it has none.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const perf = await gamePerfForPin(intParam((await ctx.params).id));
  return perf ? json(perf) : noContent();
});

// Stores a rubric: body { gameplay, story, visuals, audio, content, polish,
// acclaim (each 0-5 in half steps, or null; at least one score), rubricYear
// (required: the game's release year, the era the scores are relative to),
// source ('session' | 'hand'), basis, sourceUrl }.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const checked = gamePerfProblem(await readJson(request));
  if (typeof checked === 'string') throw new HttpError(400, checked);
  if (!(await saveGamePerf(pinId, checked.scores, checked))) throw new HttpError(409, 'This pin has a game rubric set by hand; send source "hand" to replace it.');
  expirePinPage(pinId);
  return json(await gamePerfForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteGamePerf(pinId);
  expirePinPage(pinId);
  return noContent();
});
