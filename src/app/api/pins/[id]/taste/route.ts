import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { deleteTaste, saveTaste, tasteForPin, tasteProblem } from '@/server/model/pinTaste';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/taste'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's taste profile (src/lib/pinTaste.ts), or 204 when it has none.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const taste = await tasteForPin(intParam((await ctx.params).id));
  return taste ? json(taste) : noContent();
});

// Stores a profile: body { aroma, bitterness, sweetness, astringency, umami,
// pungent, coolness (each 0-5 in half steps, all seven required), abv (percent, optional, only a published figure) with abvSourceUrl when
// the pin's own sourceUrl is not the page that states it,
// reviews ([{url, title, publishedDate, quote}], at most 6, pages that describe
// how this product tastes), source ('session' | 'hand'), basis, sourceUrl }.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const checked = tasteProblem(await readJson(request));
  if (typeof checked === 'string') throw new HttpError(400, checked);
  if (!(await saveTaste(pinId, checked.scores, checked))) throw new HttpError(409, 'This pin has a taste profile set by hand; send source "hand" to replace it.');
  expirePinPage(pinId);
  return json(await tasteForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteTaste(pinId);
  expirePinPage(pinId);
  return noContent();
});
