import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { emitPinEvent } from '@/server/events';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Notification from '@/server/model/notification';
import Pin from '@/server/model/pin';
import PinReference from '@/server/model/pinReference';
import { invalidatePin } from '@/server/services/cache';
import { MAX_ADDED_REFERENCES, referencesToAdd } from '@/lib/duplicateDraft';
import { formDates, pinToForm } from '@/lib/pinForm';
import type { PinJson } from '@/lib/types';

type Ctx = RouteContext<'/api/pins/[id]/references'>;

// Adds references to a pin, for someone who found the event already pinned
// and brings their link to it instead of a duplicate. Any signed-in user may
// add, but only add: links the pin already has are skipped, nothing is edited
// or removed, and the pin's author is notified.
// POST /api/pins/:id/references {references: [{url, title, confidence, ...}]}
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const pinId = intParam((await ctx.params).id);
  const body = await readJson(request);
  if (!Array.isArray(body.references) || !body.references.length) {
    throw new HttpError(400, 'references must be a non-empty list');
  }
  if (body.references.length > MAX_ADDED_REFERENCES) {
    throw new HttpError(400, `At most ${MAX_ADDED_REFERENCES} references can be added at once.`);
  }
  // Only what a reference says about the page: its id, added time and adder are the server's.
  const candidates = body.references.map(
    ({ id: _id, utcCreatedDateTime: _added, addedByUserId: _by, addedByUserName: _name, addedByUserPictureUrl: _picture, ...r }: Record<string, unknown>) => r,
  );
  const problem = PinReference.problem(candidates);
  if (problem) {
    throw new HttpError(400, problem);
  }

  // The whole pin: update() rewrites every column.
  const { pin } = await Pin.queryById(pinId);
  if (!pin) {
    throw new HttpError(404, 'Not Found');
  }
  const fresh = referencesToAdd({ sourceUrl: pin.sourceUrl, references: pin.references.map((r) => ({ url: r.url })) }, candidates as { url: string }[]);
  if (!fresh.length) {
    return json({ added: 0, pin });
  }
  // Credited to whoever brought them, unless that is the pin's own author.
  const addedByUserId = Number(pin.userId) === Number(user.id) ? null : user.id;
  fresh.forEach((r) => pin.addReference(new PinReference({ ...r, addedByUserId })));

  // A more confident reference moves the pin's dates, as saving the form
  // would. Only for all-day pins, whose dates are UTC days: a timed pin's are
  // picked in the author's calendar, which the server does not know, so it
  // keeps its dates until the author next saves it.
  if (pin.allDay) {
    const { dates, overridden } = formDates(pinToForm(pin.toJSON() as PinJson));
    if (overridden || pin.sourceStartDateTime) {
      Object.assign(pin, dates);
    }
  }

  const { pin: updated } = await pin.update();
  if (updated.userId != null && Number(updated.userId) !== Number(user.id)) {
    await Notification.create({ userId: Number(updated.userId), actorId: user.id, type: Notification.types.reference, pinId });
  }
  emitPinEvent('update', updated, { userId: user.id });
  invalidatePin(pinId);

  const { pin: stored } = await Pin.queryById(pinId, user.id);
  return json({ added: fresh.length, pin: stored ?? updated }, 201);
});
