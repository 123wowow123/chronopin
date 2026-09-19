// Pin change events. Route handlers emit after a successful write; listeners
// keep the search index in step, keep summaries built from the pin's links, and feed the live stream
// (GET /api/pins/stream) that replaced socket.io.
//
// The emitter and its listeners live on globalThis: Next.js can load this
// module more than once (per route bundle, and again on every dev reload),
// and each copy must share one emitter with the listeners registered once.

import { EventEmitter } from 'node:events';
import type { Row } from './db';
import log from './util/log';

// view carries only { id, viewCount }: page views are frequent, and nothing
// but the count follows them.
export type PinEvent = 'save' | 'update' | 'remove' | 'favorite' | 'unfavorite' | 'like' | 'unlike' | 'view';
export const PIN_EVENTS: PinEvent[] = ['save', 'update', 'remove', 'favorite', 'unfavorite', 'like', 'unlike', 'view'];

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

// A user's notifications changed (one arrived, was taken back or was read).
// Carries only the user id: the live feed reads the count back for that user's
// own connections, so nothing private goes past anyone else.
const NOTIFICATIONS = 'notifications';

export function emitNotificationsChanged(userId: number) {
  pinEvents.emit(NOTIFICATIONS, userId);
}

export function onNotificationsChanged(listener: (userId: number) => void) {
  pinEvents.on(NOTIFICATIONS, listener);
  return () => pinEvents.off(NOTIFICATIONS, listener);
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

  // Long-form summary, kept up with the pin's links after the request has
  // been answered: each link gets a wiki, and the summary is rebuilt from
  // those when a link comes or goes (services/sourceWiki.ts).
  const refreshWiki = (pin: Row) => {
    import('./services/sourceWiki')
      .then(({ refreshPin }) => refreshPin(Number(pin.id)))
      .catch((err) => log.warn(`wiki refresh failed for pin ${pin.id}:`, (err as Error).message));
  };
  pinEvents.on('save', refreshWiki);
  pinEvents.on('update', refreshWiki);

  // Duplicate suggestions for the pin's author or an admin to review.
  const suggestDuplicates = (pin: Row) => {
    import('./services/duplicatePin')
      .then(({ suggestDuplicates: suggest }) => suggest(Number(pin.id)))
      .catch((err) => log.warn(`duplicate suggestions failed for pin ${pin.id}:`, (err as Error).message));
  };
  pinEvents.on('save', suggestDuplicates);
  pinEvents.on('update', suggestDuplicates);

  // New pins only: podcast episodes around the event that back it up are
  // added as references (services/podcastReferences.ts).
  const checkPodcasts = (pin: Row) => {
    import('./services/podcastReferences')
      .then(({ crossCheckPodcasts }) => crossCheckPodcasts(Number(pin.id)))
      .catch((err) => log.warn(`podcast cross-check failed for pin ${pin.id}:`, (err as Error).message));
  };
  pinEvents.on('save', checkPodcasts);

  // Stock tickers: the company's looked up, a price taken when posted and
  // at each new start date (services/pinStocks.ts).
  const syncStocks = (pin: Row) => {
    import('./services/pinStocks')
      .then(({ syncPinStocks }) => syncPinStocks(Number(pin.id)))
      .catch((err) => log.warn(`stock sync failed for pin ${pin.id}:`, (err as Error).message));
  };
  pinEvents.on('save', syncStocks);
  pinEvents.on('update', syncStocks);
}
