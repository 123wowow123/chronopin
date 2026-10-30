import { searchPinIdsCreatedSince } from './search';
import Notification from '../model/notification';
import SearchAlert, { type DueAlert } from '../model/searchAlert';
import log from '../util/log';

// Saved searches with alerts (SearchAlert, 0237). Every CHECK_MS the server
// takes the searches that have gone longest unchecked and runs each over the
// pins created since it was last checked. A pin it matches is recorded once
// (SearchAlertMatch, for the digest) and, if the reader wants the bell, told
// in it - a batch of pins one search matches in a day is one entry there.
// Sweeping on a timer keeps pin creation fast, and the claim on the old
// watermark keeps it to one run however many servers see a search due.

const CHECK_MS = 5 * 60 * 1000;
// Searches checked per tick, and how many at once: a free-text search asks the
// search microservice, so the tick is kept small.
const BATCH = 60;
const CONCURRENCY = 3;
// The most pins one sweep of one search records, so a query that matches
// everything (or a long outage) cannot bury the reader.
const MATCH_LIMIT = 100;

const g = globalThis as unknown as { __chronopinSearchAlertTimer?: ReturnType<typeof setInterval>; __chronopinSearchAlertBusy?: boolean };

async function sweep(search: DueAlert, now: Date): Promise<number> {
  // Read the pins first, claim after: a failed search is tried again from the
  // same watermark rather than skipping what it should have found.
  const ids = await searchPinIdsCreatedSince(search.query, new Date(search.since), MATCH_LIMIT, { userId: search.userId });
  if (!(await SearchAlert.claim(search.id, search.since, now))) return 0;
  const fresh = await SearchAlert.recordMatches(search.id, ids);
  if (search.notifyBell) {
    for (const { pinId, authorId } of fresh) {
      await Notification.createForSearch({ userId: search.userId, searchAlertId: search.id, pinId: Number(pinId), authorId: Number(authorId) });
    }
  }
  return fresh.length;
}

export async function checkSearchAlerts(): Promise<number> {
  if (g.__chronopinSearchAlertBusy) return 0;
  g.__chronopinSearchAlertBusy = true;
  try {
    const due = await SearchAlert.due(BATCH);
    // Taken before the searches run, so a pin created while they do is seen next time.
    const now = new Date();
    let found = 0;
    let next = 0;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, due.length) }, async () => {
        while (next < due.length) {
          const search = due[next++];
          try {
            found += await sweep(search, now);
          } catch (err) {
            log.warn(`saved search ${search.id} failed:`, (err as Error).message);
          }
        }
      }),
    );
    return found;
  } finally {
    g.__chronopinSearchAlertBusy = false;
  }
}

export function startSearchAlerts() {
  if (g.__chronopinSearchAlertTimer) return;
  const tick = () => void checkSearchAlerts().catch((err) => log.warn('saved search check failed:', (err as Error).message));
  g.__chronopinSearchAlertTimer = setInterval(tick, CHECK_MS);
  g.__chronopinSearchAlertTimer.unref();
}
