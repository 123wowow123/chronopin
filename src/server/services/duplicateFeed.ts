import Pin from '../model/pin';
import PinUpdate from '../model/pinUpdate';
import log from '../util/log';
import { addReferences } from './addReferences';
import { UPDATE_GRACE_MS } from '@/lib/dateClaims';
import { compareDayKeys, dayKeyIn } from '@/lib/format';
import { SOURCE_CONFIDENCE } from '@/lib/referenceConfidence';
import type { PinReferenceJson } from '@/lib/types';

const DAY_MS = 24 * 60 * 60 * 1000;

// A confirmed duplicate posted later is news for the pin it duplicates: the
// newer pin's source goes onto the older one as a reference, credited to its
// author, rated and dated the way that pin rates and dates its source. Being
// the newest credible claim it moves the older pin's dates (topReference), the
// article is rebuilt from the new link, and the older pin's Updates pane says
// so, linking the newer pin. Once per pair; a pair posted within the hour is
// two people pinning the same news, not an update.
//
// Resolves to the older pin's id when its source came in.
export async function feedNewerDuplicate(pinId: number, otherPinId: number, decidedByUserId: number): Promise<number | undefined> {
  const [{ pin: a }, { pin: b }] = await Promise.all([Pin.queryById(pinId), Pin.queryById(otherPinId)]);
  if (!a || !b || a.utcDeletedDateTime || b.utcDeletedDateTime) return undefined;
  const [older, newer] = new Date(a.utcCreatedDateTime).getTime() <= new Date(b.utcCreatedDateTime).getTime() ? [a, b] : [b, a];
  if (new Date(newer.utcCreatedDateTime).getTime() - new Date(older.utcCreatedDateTime).getTime() < UPDATE_GRACE_MS) return undefined;
  if (!newer.sourceUrl || (await PinUpdate.hasDuplicateFeed(older.id, newer.id))) return undefined;

  const start = new Date(newer.utcStartDateTime).getTime();
  const end = newer.utcEndDateTime ? new Date(newer.utcEndDateTime).getTime() : NaN;
  // Its days as UTC days: an all-day pin's end is exclusive.
  const startDate = Number.isFinite(start) ? dayKeyIn(start, 'UTC') : undefined;
  const lastDay = Number.isFinite(end) ? dayKeyIn(newer.allDay ? end - DAY_MS : end, 'UTC') : undefined;
  const reference: Partial<PinReferenceJson> = {
    url: newer.sourceUrl,
    title: String(newer.title).slice(0, 1024),
    confidence: SOURCE_CONFIDENCE[String(newer.dateConfidence || '').toLowerCase()] ?? SOURCE_CONFIDENCE.unknown,
    startDate,
    endDate: startDate && lastDay && compareDayKeys(lastDay, startDate) > 0 ? lastDay : undefined,
    reasoning: newer.dateConfidenceReasoning ? String(newer.dateConfidenceReasoning).slice(0, 2000) : undefined,
  };
  try {
    const result = await addReferences(older.id, [reference], Number(newer.userId ?? decidedByUserId), { relatedPinId: newer.id });
    return result?.added.length ? older.id : undefined;
  } catch (err) {
    log.warn(`feeding pin ${newer.id} into ${older.id} failed:`, (err as Error).message);
    return undefined;
  }
}
