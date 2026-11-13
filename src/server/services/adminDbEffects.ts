// What follows a write through the admin table API (src/server/adminDb.ts),
// so a raw edit shows like one made through the pin routes: each pin it
// touched has its page expired and its 'update' sent to the listeners (search,
// the live feed); anything else expires the timeline.

import type { Row, Table } from '../adminDb';
import { emitPinEvent } from '../events';
import Pin from '../model/pin';
import log from '../util/log';
import { invalidatePin, invalidateTimeline } from './cache';

// A bulk write can touch many pins; past this the timeline alone is expired.
const MAX_PINS = 200;

export function touchedPins(table: Table, rows: Row[]): number[] {
  const fields =
    table.name === 'Pin'
      ? ['id']
      : table.name === 'PinRedirect'
        ? ['fromPinId', 'toPinId']
        : table.columns.some((c) => c.name === 'pinId')
          ? ['pinId']
          : [];
  if (!fields.length) return [];
  const ids: number[] = [];
  for (const row of rows) {
    for (const field of fields) {
      const id = Number(row[field]);
      if (Number.isInteger(id) && id > 0) ids.push(id);
    }
  }
  return [...new Set(ids)];
}

export async function afterAdminWrite(table: Table, rows: Row[], userId: number) {
  const pins = touchedPins(table, rows);
  invalidateTimeline();
  for (const id of pins.slice(0, MAX_PINS)) {
    invalidatePin(id);
    try {
      const { pin } = await Pin.queryById(id);
      // A pin hidden by the write (utcDeletedDateTime set) leaves the feed.
      if (pin) emitPinEvent('update', pin, { userId });
      else emitPinEvent('remove', { id }, { userId });
    } catch (err) {
      log.warn(`admin write: pin ${id} not re-sent:`, (err as Error).message);
    }
  }
}
