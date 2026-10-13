import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { hotelForPin, hotelProblem, deleteHotel, saveHotel } from '@/server/model/pinHotel';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/hotel'>;

async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's hotel rubric (src/lib/pinHotel.ts), or 204 when it has none.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const hotel = await hotelForPin(intParam((await ctx.params).id));
  return hotel ? json(hotel) : noContent();
});

// Stores a rubric: body { rooms, service, location, cleanliness, value, acclaim (each 0-5
// in half steps, or null where no figure is published; all six keys
// required, at least one score), reviews ([{url, title, publishedDate,
// quote}], at most 6, pages that review this property; left out it keeps the
// pin's existing reviews, [] clears them), source ('session' | 'hand'),
// basis, sourceUrl }.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const checked = hotelProblem(await readJson(request));
  if (typeof checked === 'string') throw new HttpError(400, checked);
  if (!(await saveHotel(pinId, checked.scores, checked))) throw new HttpError(409, 'This pin has a hotel rubric set by hand; send source "hand" to replace it.');
  expirePinPage(pinId);
  return json(await hotelForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteHotel(pinId);
  expirePinPage(pinId);
  return noContent();
});
