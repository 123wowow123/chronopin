// Pin change events. Route handlers emit after a successful write; listeners
// keep the search index in step, fill in summaries, and feed the live stream
// (GET /api/pins/stream) that replaced socket.io.
//
// The emitter and its listeners live on globalThis: Next.js can load this
// module more than once (per route bundle, and again on every dev reload),
// and each copy must share one emitter with the listeners registered once.

import { EventEmitter } from 'node:events';
import type { Row } from './db';
import log from './util/log';

export type PinEvent = 'save' | 'update' | 'remove' | 'favorite' | 'unfavorite' | 'like' | 'unlike';
export const PIN_EVENTS: PinEvent[] = ['save', 'update', 'remove', 'favorite', 'unfavorite', 'like', 'unlike'];

type Listener = (pin: Row, options?: { userId?: number }) => void;

const g = globalThis as unknown as { __chronopinPinEvents?: EventEmitter; __chronopinPinListeners?: boolean };

export const pinEvents: EventEmitter = (g.__chronopinPinEvents ??= new EventEmitter().setMaxListeners(0));

export function emitPinEvent(event: PinEvent, pin: Row, options?: { userId?: number }) {
  pinEvents.emit(event, pin, options);
}

export function onPinEvent(event: PinEvent, listener: Listener) {
  pinEvents.on(event, listener);
  return () => pinEvents.off(event, listener);
}

if (!g.__chronopinPinListeners) {
  g.__chronopinPinListeners = true;

  // Search index: pins added or edited are (re)embedded, deleted ones removed.
  // A search service that is down must not fail the write that triggered this.
  const syncSearch = (action: 'upsert' | 'remove') => (pin: Row) => {
    import('./model/searchPin')
      .then(({ SearchPin }) => (action === 'upsert' ? new SearchPin(pin).save() : new SearchPin(pin).delete()))
      .catch((err) => log.warn(`search ${action} failed for pin ${pin.id}:`, (err as Error).message));
  };
  pinEvents.on('save', syncSearch('upsert'));
  pinEvents.on('update', syncSearch('upsert'));
  pinEvents.on('remove', syncSearch('remove'));

  // Long-form summary, generated after the request has been answered.
  const summarize = (pin: Row) => {
    Promise.all([import('./summarize'), import('./model/pin')])
      .then(async ([{ generateSummary }, { default: Pin }]) => {
        const summary = await generateSummary(pin);
        if (summary) {
          await Pin.updateLongFormSummary(pin.id, summary);
        }
      })
      .catch((err) => log.warn('pin summarize failed:', (err as Error).message));
  };
  pinEvents.on('save', summarize);
  pinEvents.on('update', summarize);

  // Duplicate suggestions for the pin's author or an admin to review.
  const suggestDuplicates = (pin: Row) => {
    import('./services/duplicatePin')
      .then(({ suggestDuplicates: suggest }) => suggest(Number(pin.id)))
      .catch((err) => log.warn(`duplicate suggestions failed for pin ${pin.id}:`, (err as Error).message));
  };
  pinEvents.on('save', suggestDuplicates);
  pinEvents.on('update', suggestDuplicates);
}
