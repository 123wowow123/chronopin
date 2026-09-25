import PinUpdate from '../model/pinUpdate';
import { UPDATE_GRACE_MS } from '@/lib/dateClaims';
import log from '../util/log';
import { mergeChanges, pinChanges, updateReference, type PinChange, type PinUpdateKind, type PinUpdateReference, type Trackable } from '@/lib/pinUpdates';

// Records what a write changed on a pin (0081), for the pin page's Updates
// pane. A failure here is logged, never thrown: the write it describes has
// already happened.

// How long after a reference or an edit the article rewrite its links bring
// still counts as part of it, so the pane shows one update rather than two.
// Long enough for a hand wiki:export/apply round.
export const REWRITE_FOLD_MS = 3 * 24 * 60 * 60 * 1000;

// The fields a write can change, copied before it: a Pin model's own are
// overwritten by the write.
export function trackable(pin: Trackable): Trackable {
  const { title, description, longFormSummary, utcStartDateTime, utcEndDateTime, allDay, address, price } = pin;
  return { title, description, longFormSummary, utcStartDateTime, utcEndDateTime, allDay, address, price };
}

// Nothing is recorded in the hour after the pin went up (postedAt): a typo
// fixed or a reference found then is part of posting it, not news.
export async function recordPinUpdate({
  pinId,
  kind,
  userId,
  relatedPinId,
  before,
  after,
  references = [],
  note,
  postedAt,
}: {
  pinId: number;
  kind: PinUpdateKind;
  userId?: number | null;
  relatedPinId?: number | null;
  before: Trackable;
  after: Trackable;
  references?: PinUpdateReference[];
  note?: string | null;
  postedAt: string | Date | null | undefined;
}): Promise<number | undefined> {
  const posted = postedAt ? new Date(postedAt).getTime() : NaN;
  if (!Number.isFinite(posted) || Date.now() - posted < UPDATE_GRACE_MS) return undefined;
  const changes = pinChanges(before, after);
  if (!changes.length && !references.length) return undefined;
  try {
    return await PinUpdate.create({ pinId, kind, userId, relatedPinId, changes, references: references.map(updateReference), note });
  } catch (err) {
    log.warn(`recording pin ${pinId}'s update failed:`, (err as Error).message);
    return undefined;
  }
}

// The article rewritten from the pin's links: folded into the reference, pin
// or edit that brought them when that was recent and has not been rewritten
// for yet; else an update of its own.
export async function recordRewrite(pinId: number, changes: PinChange[], note?: string | null) {
  if (!changes.length) return;
  try {
    const recent = await PinUpdate.latestSince(pinId, new Date(Date.now() - REWRITE_FOLD_MS));
    if (recent && recent.kind !== 'summary' && !recent.changes.some((c) => c.field === 'longFormSummary')) {
      await PinUpdate.amend(recent.id, mergeChanges(recent.changes, changes), note);
      return;
    }
    await PinUpdate.create({ pinId, kind: 'summary', changes, references: [], note });
  } catch (err) {
    log.warn(`recording pin ${pinId}'s rewrite failed:`, (err as Error).message);
  }
}
