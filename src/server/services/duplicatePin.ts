import * as db from '../db';
import Pin, { sameSourceUrlKey } from '../model/pin';
import PinDuplicate, { type DuplicateReason } from '../model/pinDuplicate';
import { SearchPins } from '../model/searchPin';
import { HttpError } from '../util/httpError';
import log from '../util/log';

// A user may post a given source URL only once. The body names the existing
// pin so the form can link to it.
export async function rejectDuplicateSourceUrl(pin: Pin) {
  const existing = await Pin.findBySourceUrl(pin.userId, pin.sourceUrl, pin.id);
  if (existing) {
    const message = 'You have already posted a pin with this source URL.';
    throw new HttpError(409, message, { message, pin: existing });
  }
}

// How close (the search service's cosine score, title against title and
// description) another pin must be to be suggested as a duplicate. Measured on
// the local pins in September 2026: real duplicates scored 0.84-0.92, while
// different products from one launch scored up to 0.81 (iPhone 18 Pro vs Pro
// Max). People confirm every suggestion, so this errs toward suggesting.
export const SIMILAR_TITLE_MIN = 0.8;
// Pins a day apart can still be one event: an all-day pin sits at 00:00Z while
// a timed one lands on the local date of its instant.
export const MAX_DAYS_APART = 1;
const SIMILAR_CANDIDATES = 10;

export type DuplicateMatch = { reason: DuplicateReason; score: number | null };

// Live pins (other than pinId, 0 for a pin not saved yet) starting within a
// day of start that share the source URL or closely match the title, keyed by
// pin id. A search service that is down only skips the title match.
export async function findDuplicates({
  pinId = 0,
  title,
  sourceUrl,
  utcStartDateTime,
}: {
  pinId?: number;
  title: string | null | undefined;
  sourceUrl: string | null | undefined;
  utcStartDateTime: Date | string;
}): Promise<Map<number, DuplicateMatch>> {
  const found = new Map<number, DuplicateMatch>();
  const urlKey = sameSourceUrlKey(sourceUrl);
  if (urlKey) {
    for (const id of await PinDuplicate.sameSourceUrl(pinId, utcStartDateTime, urlKey, MAX_DAYS_APART)) {
      found.set(id, { reason: 'sourceUrl', score: null });
    }
  }

  if (title?.trim()) {
    try {
      const hits = (await SearchPins.nearest(title, SIMILAR_CANDIDATES)).filter((hit) => hit.id !== pinId && hit.score >= SIMILAR_TITLE_MIN);
      const scores = new Map(hits.map((hit) => [hit.id, hit.score]));
      const sameDay = await PinDuplicate.withinDays(pinId, utcStartDateTime, [...scores.keys()], MAX_DAYS_APART);
      for (const id of sameDay) {
        if (!found.has(id)) {
          found.set(id, { reason: 'similar', score: scores.get(id)! });
        }
      }
    } catch (err) {
      log.warn(`duplicate title check skipped for ${pinId ? `pin ${pinId}` : 'a new pin'}:`, (err as Error).message);
    }
  }
  return found;
}

// Suggests duplicates for a pin (see findDuplicates). Earlier suggestions an
// edit's new date rules out are dropped; decided pairs are left alone.
// Resolves to the number of new suggestions.
export async function suggestDuplicates(pinId: number): Promise<number> {
  const [pin] = await db.query<{ title: string; sourceUrl: string | null; utcStartDateTime: Date }>(
    `SELECT "title", "sourceUrl", "utcStartDateTime" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  if (!pin) {
    return 0;
  }
  await PinDuplicate.clearStaleSuggestions(pinId, MAX_DAYS_APART);

  const found = await findDuplicates({ pinId, ...pin });

  let added = 0;
  for (const [id, { reason, score }] of found) {
    if (await PinDuplicate.suggest(pinId, id, reason, score)) {
      added++;
    }
  }
  return added;
}

// Who may confirm or reject a pair: an admin, or the author of either pin.
export function canDecideDuplicate(user: { id: number; role?: string }, pinUserIds: (number | null | undefined)[]) {
  return user.role === 'admin' || pinUserIds.some((id) => id != null && Number(id) === Number(user.id));
}
