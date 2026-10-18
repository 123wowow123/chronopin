import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { diningForPin, diningProblem, deleteDining, saveDining } from '@/server/model/pinDining';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/dining'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's dining rubric (src/lib/pinDining.ts), or 204 when it has none.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const dining = await diningForPin(intParam((await ctx.params).id));
  return dining ? json(dining) : noContent();
});

// Stores a rubric: body { food, service, ambience, value, acclaim (each 0-5
// in half steps, or null where no figure is published; all five keys
// required, at least one score), reviews ([{url, title, publishedDate,
// quote}], at most 6, pages that review this venue; left out it keeps the
// pin's existing reviews, [] clears them), source ('session' | 'hand'),
// basis, sourceUrl }.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const checked = diningProblem(await readJson(request));
  if (typeof checked === 'string') throw new HttpError(400, checked);
  if (!(await saveDining(pinId, checked.scores, checked))) throw new HttpError(409, 'This pin has a dining rubric set by hand; send source "hand" to replace it.');
  expirePinPage(pinId);
  return json(await diningForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteDining(pinId);
  expirePinPage(pinId);
  return noContent();
});
