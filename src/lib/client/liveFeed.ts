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
// A stream the browser gave up on - it closes for good when a reconnect is
// answered with anything but the stream, such as the proxy's 502 while the
// app restarts - is reopened after these pauses, the last repeating.
const RETRY_MS = [2000, 5000, 15000, 30000, 60000];
// The server pings every 25 seconds; a visible page that has heard nothing
// for this long holds a dead stream (a phone that slept keeps one that still
// reads as open) and opens a new one. Only once this stream has pinged: a
// server from before the pings (mid-deploy) would otherwise look dead.
const SILENT_MS = 70_000;
const WATCH_MS = 30_000;

const handlers = new Map<string, Set<Handler>>();
const connectListeners = new Set<(id: string) => void>();
const reconnectListeners = new Set<() => void>();
const latest = new Map<string, unknown>();
let source: EventSource | null = null;
let attached = new Set<string>();
let connectionId: string | null = null;
let closeTimer: ReturnType<typeof setTimeout> | undefined;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let watchTimer: ReturnType<typeof setInterval> | undefined;
let failures = 0;
let lastHeard = 0;
let pinged = false;
// Whether this stream has said hello before, so the next hello is a
// reconnect after which events may have been missed.
let greeted = false;

function attach(type: string) {
  if (!source || attached.has(type)) return;
  attached.add(type);
  source.addEventListener(type, (event) => {
    lastHeard = Date.now();
    const data = JSON.parse((event as MessageEvent).data);
    if (REPLAYED.has(type)) latest.set(type, data);
    handlers.get(type)?.forEach((handler) => handler(data));
  });
}

function inUse() {
  return connectListeners.size > 0 || [...handlers.values()].some((set) => set.size > 0);
}

function open() {
  clearTimeout(closeTimer);
  if (source) return;
  const opened = new EventSource('/api/live');
  source = opened;
  attached = new Set();
  lastHeard = Date.now();
  pinged = false;
  opened.addEventListener('hello', (event) => {
    lastHeard = Date.now();
    failures = 0;
    const id = (JSON.parse((event as MessageEvent).data) as { id: string }).id;
    connectionId = id;
    connectListeners.forEach((listener) => listener(id));
    if (greeted) reconnectListeners.forEach((listener) => listener());
    greeted = true;
  });
  opened.addEventListener('ping', () => {
    lastHeard = Date.now();
    pinged = true;
  });
  // Dropped: EventSource reconnects by itself, and the new connection says
  // hello with a new id. Closed: it has stopped trying, so this does.
  opened.addEventListener('error', () => {
    connectionId = null;
    if (opened === source && opened.readyState === EventSource.CLOSED) {
      clearTimeout(retryTimer);
      retryTimer = setTimeout(reopen, RETRY_MS[Math.min(failures++, RETRY_MS.length - 1)]);
    }
  });
  handlers.forEach((_set, type) => attach(type));
  clearInterval(watchTimer);
  watchTimer = setInterval(() => {
    if (document.visibilityState === 'visible' && silent()) reopen();
  }, WATCH_MS);
}

function silent() {
  return pinged && Date.now() - lastHeard > SILENT_MS;
}

// A new stream in place of one that closed or went quiet.
function reopen() {
  clearTimeout(retryTimer);
  source?.close();
  source = null;
  connectionId = null;
  if (inUse()) open();
}

// A phone coming back to the tab, a network returning, or a page restored
// from the back/forward cache: a stream that died meanwhile is replaced at
// once rather than on the retry timer or the silence watch.
function wake() {
  if (!source || !inUse()) return;
  if (source.readyState === EventSource.CLOSED || silent()) reopen();
}

if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') wake();
  });
  window.addEventListener('online', wake);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) wake();
  });
}

function closeWhenUnused() {
  if (inUse()) return;
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    clearTimeout(retryTimer);
    clearInterval(watchTimer);
    source?.close();
    source = null;
    connectionId = null;
    greeted = false;
    failures = 0;
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

// Calls listener each time the stream comes back after a drop, when anything
// broadcast while it was down never arrived: a part that shows a list fetches
// it again. It does not hold the stream open by itself - pair it with onLive.
export function onLiveReconnect(listener: () => void): () => void {
  reconnectListeners.add(listener);
  return () => {
    reconnectListeners.delete(listener);
  };
}
