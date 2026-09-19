import { after, type NextRequest } from 'next/server';
import { getUser, isAdmin, requireUser } from '@/server/auth';
import { emitPinEvent } from '@/server/events';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import Pin, { sameSourceUrlKey } from '@/server/model/pin';
import PinDuplicate from '@/server/model/pinDuplicate';
import PinReference from '@/server/model/pinReference';
import type User from '@/server/model/user';
import { invalidatePin } from '@/server/services/cache';
import { addPinStocksQuietly } from '@/server/services/pinStocks';
import { rejectDuplicateSourceUrl } from '@/server/services/duplicatePin';
import { attributeReferences } from '@/lib/referenceAttribution';
import { parseScrapedStocks } from '@/lib/stocks';

type Ctx = RouteContext<'/api/pins/[id]'>;

export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await getUser(request);
  const { pin } = await Pin.queryById(pinId, user?.id);
  if (!pin) {
    throw new HttpError(404, 'Not Found');
  }
  return json(pin);
});

// A pin is editable by the person who posted it and by an admin. Signing in
// alone is not enough, or any account could rewrite anyone's pins.
async function loadModifiable(request: NextRequest, ctx: Ctx): Promise<{ user: User; existing: Pin }> {
  const pinId = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const { pin: existing } = await Pin.queryById(pinId);
  if (!existing) {
    throw new HttpError(404, 'Not Found');
  }
  if (!isAdmin(user) && Number(existing.userId) !== Number(user.id)) {
    throw new HttpError(403, 'Forbidden');
  }
  return { user, existing };
}

const update = route(async (request: NextRequest, ctx: Ctx) => {
  const { user, existing } = await loadModifiable(request, ctx);

  const body = await readJson(request);
  const pin = new Pin(body);
  // Tickers in the body are added, never replace the pin's (pin page edits
  // them); leaving them out changes nothing.
  const stocks = parseScrapedStocks(body.stocks);
  const referenceProblem = PinReference.problem(pin.references);
  if (referenceProblem) {
    throw new HttpError(400, referenceProblem);
  }
  pin.id = existing.id;
  // Keep whoever posted it as the author; an edit is not a transfer of
  // ownership, and an update writes userId on every save.
  pin.userId = existing.userId;
  // References are re-saved wholesale: the ones the pin had keep their
  // contributor, and any new one an admin adds to someone else's pin is theirs.
  attributeReferences(pin.references, { existing: existing.references, editorId: user.id, authorId: existing.userId });
  // Only a changed URL is checked, so pins that already share one stay editable.
  if (sameSourceUrlKey(pin.sourceUrl) !== sameSourceUrlKey(existing.sourceUrl)) {
    await rejectDuplicateSourceUrl(pin);
  }

  const { pin: updated } = await pin.update();
  emitPinEvent('update', updated, { userId: user.id });
  invalidatePin(updated.id);
  if (stocks.length) after(() => addPinStocksQuietly(updated.id, stocks));

  const { pin: stored } = await Pin.queryById(updated.id, user.id);
  return json(stored ?? updated);
});

export const PUT = update;
export const PATCH = update;

// A soft delete.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const { user, existing } = await loadModifiable(request, ctx);
  // Its duplicates' pages list it, so they refresh too.
  const group = await PinDuplicate.group(existing.id);
  await existing.delete();
  emitPinEvent('remove', existing, { userId: user.id });
  for (const id of group) {
    invalidatePin(id);
  }
  return noContent();
});
