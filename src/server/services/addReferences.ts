import { emitPinEvent } from '@/server/events';
import Notification from '@/server/model/notification';
import Pin from '@/server/model/pin';
import PinReference from '@/server/model/pinReference';
import { invalidatePin } from '@/server/services/cache';
import { referencesToAdd } from '@/lib/duplicateDraft';
import { formDates, pinToForm } from '@/lib/pinForm';
import type { PinJson, PinReferenceJson } from '@/lib/types';

// Adds references to a pin on someone's behalf, and only adds: links the pin
// already has are skipped, nothing is edited or removed, and the pin's author
// is notified. For someone who brings their link to a pin instead of a
// duplicate (POST /api/pins/:id/references), and for a suggestion whose AI
// review found pages backing it (src/server/services/suggestions.ts).
//
// Undefined when the pin is gone; otherwise what was added, which may be
// nothing, and the pin as it now stands.
export async function addReferences(pinId: number, candidates: Partial<PinReferenceJson>[], userId: number) {
  // The whole pin: update() rewrites every column.
  const { pin } = await Pin.queryById(pinId);
  if (!pin) {
    return undefined;
  }
  const fresh = referencesToAdd({ sourceUrl: pin.sourceUrl, references: pin.references.map((r) => ({ url: r.url })) }, candidates as { url: string }[]);
  if (!fresh.length) {
    return { added: [] as typeof fresh, pin };
  }
  // Credited to whoever brought them, unless that is the pin's own author.
  const addedByUserId = Number(pin.userId) === Number(userId) ? null : userId;
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
  if (updated.userId != null && Number(updated.userId) !== Number(userId)) {
    await Notification.create({ userId: Number(updated.userId), actorId: userId, type: Notification.types.reference, pinId });
  }
  emitPinEvent('update', updated, { userId });
  try {
    invalidatePin(pinId);
  } catch {
    // Outside a Next.js server (suggestions:review), there is no page cache to expire.
  }
  return { added: fresh, pin: updated };
}
