'use client';

// The page's one live stream (GET /api/live). Pin changes, market odds and the
// viewer's unread notification count all arrive over it, however many parts of
// the page are live: a browser holds only about six connections to a host,
// and a stream each would starve everything else. It opens when the first
// part subscribes and closes soon after the last one leaves. The events are
// listed in src/server/liveFeed.ts.

type Handler = (data: unknown) => void;

// Long enough to ride out a client navigation, where one page's parts
// unsubscribe just before the next page's subscribe.
const CLOSE_DELAY_MS = 2000;
// State rather than happenings: a part that subscribes late still wants the
// latest one.
const REPLAYED = new Set(['notifications']);

const handlers = new Map<string, Set<Handler>>();
const connectListeners = new Set<(id: string) => void>();
const latest = new Map<string, unknown>();
let source: EventSource | null = null;
let attached = new Set<string>();
let connectionId: string | null = null;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function attach(type: string) {
  if (!source || attached.has(type)) return;
  attached.add(type);
  source.addEventListener(type, (event) => {
    const data = JSON.parse((event as MessageEvent).data);
    if (REPLAYED.has(type)) latest.set(type, data);
    handlers.get(type)?.forEach((handler) => handler(data));
  });
}

function open() {
  clearTimeout(closeTimer);
  if (source) return;
  source = new EventSource('/api/live');
  attached = new Set();
  source.addEventListener('hello', (event) => {
    const id = (JSON.parse((event as MessageEvent).data) as { id: string }).id;
    connectionId = id;
    connectListeners.forEach((listener) => listener(id));
  });
  // Dropped: EventSource reconnects by itself, and the new connection says
  // hello with a new id.
  source.addEventListener('error', () => {
    connectionId = null;
  });
  handlers.forEach((_set, type) => attach(type));
}

function closeWhenUnused() {
  const used = connectListeners.size > 0 || [...handlers.values()].some((set) => set.size > 0);
  if (used) return;
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    source?.close();
    source = null;
    connectionId = null;
    latest.clear();
  }, CLOSE_DELAY_MS);
}

// Calls handler with each event of this type until the returned function is
// called.
export function onLive<T = unknown>(type: string, handler: (data: T) => void): () => void {
  let set = handlers.get(type);
  if (!set) handlers.set(type, (set = new Set()));
  // Each event type has one payload shape; the caller names it.
  const stored = handler as Handler;
  set.add(stored);
  open();
  attach(type);
  if (latest.has(type)) handler(latest.get(type) as T);
  return () => {
    set.delete(stored);
    closeWhenUnused();
  };
}

// Calls listener with the connection's id now, if connected, and again after
// every reconnect, for requests that tell the server what this page follows.
export function onLiveConnect(listener: (id: string) => void): () => void {
  connectListeners.add(listener);
  open();
  if (connectionId) listener(connectionId);
  return () => {
    connectListeners.delete(listener);
    closeWhenUnused();
  };
}
