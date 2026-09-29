import type { NextRequest } from 'next/server';
import { isAdmin, requireUser } from '@/server/auth';
import * as db from '@/server/db';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import { deleteEventInfo, eventInfoForPin, eventInfoProblem, saveEventInfo } from '@/server/model/pinEventInfo';
import { expirePinPage } from '@/server/services/cache';

type Ctx = RouteContext<'/api/pins/[id]/event-info'>;

// Only the pin's author and admins set who performs and how to get in.
async function authorOrAdmin(request: NextRequest, pinId: number) {
  const user = await requireUser(request);
  const [pin] = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
  if (!pin) throw new HttpError(404, 'Not Found');
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) throw new HttpError(403, 'Forbidden');
}

// The pin's performers and tickets (src/lib/eventInfo.ts), or 204 when none
// were read.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const info = await eventInfoForPin(intParam((await ctx.params).id));
  return info ? json(info) : noContent();
});

// Stores a reading: body { performers, ticketUrl, lowPrice, highPrice,
// priceCurrency, availability, onSaleDate, source, sourceUrl, checkedAt? }.
// A reading with source 'hand' is kept over later refreshes; any other source
// does not replace a hand one (409).
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  const body = await readJson(request);
  const checked = eventInfoProblem(body);
  if (typeof checked === 'string') throw new HttpError(400, checked);
  const checkedAt = body.checkedAt ? new Date(String(body.checkedAt)) : undefined;
  if (checkedAt && Number.isNaN(checkedAt.getTime())) throw new HttpError(400, 'checkedAt is not a date.');
  const stored = await saveEventInfo(pinId, checked.fields, { source: checked.source, sourceUrl: checked.sourceUrl, checkedAt });
  if (!stored) throw new HttpError(409, 'This pin has event info set by hand; send source "hand" to replace it.');
  expirePinPage(pinId);
  return json(await eventInfoForPin(pinId));
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  await authorOrAdmin(request, pinId);
  await deleteEventInfo(pinId);
  expirePinPage(pinId);
  return noContent();
});
