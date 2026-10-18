// One exchange's live price socket, shared by every odds feed that watches
// its markets: connecting (signed where the exchange wants it), a heartbeat,
// reconnecting with backoff, closing when nothing is watched, and which
// markets it covers since when. Each exchange's protocol (kalshiStream.ts,
// polymarketStream.ts, polymarketUsStream.ts) only turns the wanted markets
// into subscriptions and messages into prices. Per-process, like the feeds.

import log from './util/log';

const CONNECT_TIMEOUT_MS = 10_000;
// How long a socket stays open with nothing watched, for the next page.
const IDLE_MS = 60_000;
const MAX_RETRY_MS = 60_000;

// A market's chance (0-1) from the socket, and when it arrived (this server's
// clock, like a REST read's fetchedAt).
export type Quote = { chance: number; at: number };

export type MarketStream = {
  // Calls watcher each time one of these markets' prices changes. Does nothing
  // when the stream is off (no key), leaving the markets to REST.
  watch(ids: string[], watcher: () => void): () => void;
  // Since when the socket has had a market's price without a gap, or undefined
  // when it hasn't (a REST read is then what's current).
  coveredSince(id: string): number | undefined;
  quote(id: string): Quote | undefined;
};

// What a protocol can do with the open socket.
export type Conn<S> = {
  // Protocol state, fresh for each socket.
  state: S;
  // The watched markets.
  wanted(): string[];
  wants(id: string): boolean;
  send(message: string | object): void;
  // A market's price. Ignored for markets no longer watched.
  price(id: string, chance: number | null | undefined): void;
  // Markets the socket now keeps current (from a subscription's snapshot or
  // ack), or no longer does.
  cover(ids: Iterable<string>): void;
  uncover(ids: Iterable<string>): void;
  // Runs sync again, e.g. once a command it waited on is answered.
  resync(): void;
  // Gives up on this socket; a new one is opened while markets are watched.
  fail(why: string): void;
};

export type Protocol<S> = {
  name: string;
  url: string;
  // False turns the stream off (no key configured).
  enabled(): boolean;
  headers(): Record<string, string>;
  // Sent this often; a socket silent for over two beats is taken as dead, so
  // it must draw a reply.
  heartbeatMs: number;
  heartbeat(conn: Conn<S>): void;
  initial(): S;
  // Moves subscriptions towards conn.wanted. Called whenever the watched
  // markets change, the socket opens, or resync is asked for.
  sync(conn: Conn<S>): void;
  receive(conn: Conn<S>, data: string): void;
  // Whether the socket holds no subscriptions, so may close.
  idle(conn: Conn<S>): boolean;
};

type Core<S> = {
  socket?: WebSocket;
  conn?: Conn<S>;
  open: boolean;
  covered: Map<string, number>;
  quotes: Map<string, Quote>;
  watchers: Map<string, Set<() => void>>;
  lastMessageAt: number;
  heartbeat?: ReturnType<typeof setInterval>;
  retries: number;
  retryTimer?: ReturnType<typeof setTimeout>;
  idleTimer?: ReturnType<typeof setTimeout>;
  syncQueued: boolean;
};

export function marketSocket<S>(protocol: Protocol<S>): MarketStream {
  // On globalThis so dev reloads share one socket per exchange.
  const store = globalThis as any;
  const core: Core<S> = (store[`__chronopinMarketSocket:${protocol.name}`] ??= {
    open: false,
    covered: new Map(),
    quotes: new Map(),
    watchers: new Map(),
    lastMessageAt: 0,
    retries: 0,
    syncQueued: false,
  });

  function queueSync() {
    if (core.syncQueued) return;
    core.syncQueued = true;
    queueMicrotask(() => {
      core.syncQueued = false;
      sync();
    });
  }

  function sync() {
    if (!core.watchers.size) {
      if (core.conn && core.open) {
        protocol.sync(core.conn);
        if (protocol.idle(core.conn)) core.idleTimer ??= setTimeout(closeIfIdle, IDLE_MS);
      }
      return;
    }
    clearTimeout(core.idleTimer);
    core.idleTimer = undefined;
    if (!core.socket) {
      if (!core.retryTimer) connect();
      return;
    }
    if (core.conn && core.open) protocol.sync(core.conn);
  }

  function closeIfIdle() {
    core.idleTimer = undefined;
    const socket = core.socket;
    if (core.watchers.size || !socket) return;
    drop(socket);
    socket.close();
  }

  function connect() {
    if (!protocol.enabled()) return;
    const headers = protocol.headers();
    // Node's WebSocket (undici) takes handshake headers, unlike a browser's.
    const socket = new WebSocket(protocol.url, { headers } as any);
    const conn: Conn<S> = {
      state: protocol.initial(),
      wanted: () => [...core.watchers.keys()],
      wants: (id) => core.watchers.has(id),
      send: (message) => {
        if (core.socket === socket) socket.send(typeof message === 'string' ? message : JSON.stringify(message));
      },
      price: (id, chance) => {
        if (core.socket !== socket || !core.watchers.has(id) || chance == null || !Number.isFinite(chance)) return;
        const before = core.quotes.get(id)?.chance;
        core.quotes.set(id, { chance, at: Date.now() });
        if (before !== chance) core.watchers.get(id)!.forEach((watcher) => watcher());
      },
      cover: (ids) => {
        if (core.socket !== socket) return;
        const now = Date.now();
        // Serving markets again, so the next failure starts its backoff over.
        core.retries = 0;
        for (const id of ids) if (core.watchers.has(id) && !core.covered.has(id)) core.covered.set(id, now);
      },
      uncover: (ids) => {
        for (const id of ids) core.covered.delete(id);
      },
      resync: () => {
        if (core.socket === socket) queueSync();
      },
      fail: (why) => lost(socket, why),
    };
    core.socket = socket;
    core.conn = conn;
    core.open = false;
    const connecting = setTimeout(() => lost(socket, 'timed out connecting'), CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      clearTimeout(connecting);
      if (core.socket !== socket) return;
      core.open = true;
      core.lastMessageAt = Date.now();
      core.heartbeat = setInterval(() => {
        if (Date.now() - core.lastMessageAt > protocol.heartbeatMs * 2) return lost(socket, 'stopped answering');
        protocol.heartbeat(conn);
      }, protocol.heartbeatMs);
      queueSync();
    };
    socket.onmessage = (event) => {
      if (core.socket !== socket) return;
      core.lastMessageAt = Date.now();
      try {
        protocol.receive(conn, String(event.data));
      } catch (err) {
        log.error(`${protocol.name} stream message`, (err as Error).message);
      }
    };
    socket.onclose = (event) => {
      clearTimeout(connecting);
      lost(socket, `closed (${event.code})`);
    };
  }

  // Forgets a socket, so nothing it sends later counts.
  function drop(socket: WebSocket) {
    if (core.socket !== socket) return false;
    clearInterval(core.heartbeat);
    Object.assign(core, { socket: undefined, conn: undefined, open: false, heartbeat: undefined });
    core.covered.clear();
    return true;
  }

  // A socket that failed: its markets fall back to REST until a new one is up.
  function lost(socket: WebSocket, why: string) {
    const wasOpen = core.open;
    if (!drop(socket)) return;
    if (socket.readyState !== WebSocket.CLOSED) socket.close();
    if (!core.watchers.size) return;
    const delay = Math.min(1000 * 2 ** core.retries++, MAX_RETRY_MS);
    log.warn(`${protocol.name} stream ${wasOpen ? '' : 'connection '}${why}; polling REST, retrying in ${delay / 1000}s`);
    core.retryTimer = setTimeout(() => {
      core.retryTimer = undefined;
      sync();
    }, delay);
  }

  return {
    watch(ids, watcher) {
      if (!ids.length || !protocol.enabled()) return () => {};
      for (const id of ids) {
        let set = core.watchers.get(id);
        if (!set) core.watchers.set(id, (set = new Set()));
        set.add(watcher);
      }
      queueSync();
      return () => {
        for (const id of ids) {
          const set = core.watchers.get(id);
          if (!set?.delete(watcher) || set.size) continue;
          core.watchers.delete(id);
          core.quotes.delete(id);
          core.covered.delete(id);
        }
        queueSync();
      };
    },
    coveredSince(id) {
      return core.open ? core.covered.get(id) : undefined;
    },
    quote(id) {
      return core.quotes.get(id);
    },
  };
}

