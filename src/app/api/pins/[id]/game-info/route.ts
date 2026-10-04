import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import PinRating from '@/server/model/pinRating';
import Pin from '@/server/model/pin';
import { deleteGameInfo, gameInfoForPin, gameInfoProblem, saveGameInfo } from '@/server/model/pinGameInfo';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/game-info'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's maturity rating and platforms (src/lib/gameInfo.ts), or 204 when
// none were read.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const info = await gameInfoForPin(intParam((await ctx.params).id));
  return info ? json(info) : noContent();
});

// Stores a reading: body { maturityBoard, maturityRating, descriptors,
// platforms, source, sourceUrl, ratings? }. ratings ([{ source, score,
// scoreMax, url }]) refresh the pin's aggregated scores alongside.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const body = await readJson(request);
  const checked = gameInfoProblem(body);
  if (typeof checked === 'string') throw new HttpError(400, checked);
  if (Array.isArray(body.ratings) && body.ratings.length) {
    const bad = PinRating.problem(body.ratings);
    if (bad) throw new HttpError(400, bad);
  }
  if (!(await saveGameInfo(pinId, checked.fields, checked))) throw new HttpError(409, 'This pin has game info set by hand; send source "hand" to replace it.');
  if (Array.isArray(body.ratings) && body.ratings.length) await Pin.setRatings(pinId, body.ratings);
  expirePinPage(pinId);
  return json(await gameInfoForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteGameInfo(pinId);
  expirePinPage(pinId);
  return noContent();
});
