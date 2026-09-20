// One live connection per open page (GET /api/live) carrying every update the
// page needs, so a tab holds a single stream however much of the site is live:
//
//   hello           { id }  first, naming the connection for PUT /api/live/:id/odds
//   pin:<event>     a pin saved, updated, removed, watched or liked (everyone);
//                   pin:view is just { id, viewCount }
//   odds            { pinId, markets } for the pins the page says it shows
//   stock           a StockQuote for each ticker of the pins it asked quotes for
//   notifications   { unreadCount } for the signed-in viewer's own connections
//
// Like the events it relays this lives in-process, which holds while the app
// runs as a single replica; several would need Postgres LISTEN/NOTIFY.

import { randomUUID } from 'node:crypto';
import { pinMarketRefs } from '@/lib/predictionMarkets';
import { PIN_EVENTS, onNotificationsChanged, onPinEvent } from './events';
import Notification from './model/notification';
import PinTicker from './model/pinTicker';
import { subscribeQuote } from './stocks';
import { subscribeOdds } from './predictionMarkets';
import { recordMarketVolume } from './services/pinMarketVolume';
import { pinById } from './services/pages';
import log from './util/log';

// A screenful of cards, with room to spare. Ids past this are ignored.
const MAX_ODDS_PINS = 40;
// A pin links to at most a handful of markets; more would be a scrape.
const MAX_MARKETS = 4;
// How often signed-in viewers get their watched pins that land today written
// as notifications: the same minute the bell used to poll at, now server-side.
const TODAY_CHECK_MS = 60_000;
// Notification writes come in bursts (a comment notifies two people); one
// count read covers them.
const COUNT_DELAY_MS = 50;

type Send = (event: string, data: unknown) => void;

type LiveConnection = {
  id: string;
  userId: number | null;
  timeZone: string;
  send: Send;
  stops: (() => void)[];
  // Followed pins' unsubscribes, and the set the page last asked for.
  odds: Map<number, () => void>;
  oddsWanted: Set<number>;
  // Followed symbols' unsubscribes, and the pins the page last asked about.
  stocks: Map<string, () => void>;
  stocksWanted: number[];
  countQueued: boolean;
  closed: boolean;
};

// On globalThis so dev reloads share one registry and one timer.
const state = ((globalThis as any).__chronopinLiveFeed ??= {
  connections: new Map<string, LiveConnection>(),
  todayTimer: undefined,
}) as { connections: Map<string, LiveConnection>; todayTimer: ReturnType<typeof setInterval> | undefined };

function queueUnreadCount(conn: LiveConnection) {
  if (conn.userId == null || conn.countQueued) return;
  conn.countQueued = true;
  setTimeout(async () => {
    conn.countQueued = false;
    if (conn.closed) return;
    try {
      conn.send('notifications', { unreadCount: await Notification.unreadCount(conn.userId!, conn.timeZone) });
    } catch (err) {
      log.warn('live unread count failed:', (err as Error).message);
    }
  }, COUNT_DELAY_MS);
}

// Writes are announced (src/server/model/notification.ts), which is what
// pushes the new count; nothing to do here when none were due.
function notifyToday(userId: number, timeZone: string) {
  return Notification.notifyWatchedToday(userId, timeZone).catch((err) => log.warn('live today notifications failed:', (err as Error).message));
}

function startTodayChecks() {
  state.todayTimer ??= setInterval(() => {
    const seen = new Set<string>();
    for (const conn of state.connections.values()) {
      const key = `${conn.userId}|${conn.timeZone}`;
      if (conn.userId == null || seen.has(key)) continue;
      seen.add(key);
      void notifyToday(conn.userId, conn.timeZone);
    }
  }, TODAY_CHECK_MS);
}

export function openLiveConnection({ userId, timeZone, send }: { userId: number | null; timeZone: string; send: Send }) {
  const conn: LiveConnection = {
    id: randomUUID(),
    userId,
    timeZone,
    send,
    stops: [],
    odds: new Map(),
    oddsWanted: new Set(),
    stocks: new Map(),
    stocksWanted: [],
    countQueued: false,
    closed: false,
  };
  state.connections.set(conn.id, conn);
  send('hello', { id: conn.id });

  for (const event of PIN_EVENTS) {
    conn.stops.push(onPinEvent(event, (pin) => send(`pin:${event}`, pin)));
  }
  if (userId != null) {
    conn.stops.push(onNotificationsChanged((changed) => changed === userId && queueUnreadCount(conn)));
    // The count as of connecting, after any 'today' notifications due.
    void notifyToday(userId, timeZone).finally(() => queueUnreadCount(conn));
    startTodayChecks();
  }
  return conn;
}

export function closeLiveConnection(conn: LiveConnection) {
  if (conn.closed) return;
  conn.closed = true;
  conn.stops.forEach((stop) => stop());
  conn.odds.forEach((stop) => stop());
  conn.odds.clear();
  conn.stocks.forEach((stop) => stop());
  conn.stocks.clear();
  state.connections.delete(conn.id);
  if (state.todayTimer && ![...state.connections.values()].some((c) => c.userId != null)) {
    clearInterval(state.todayTimer);
    state.todayTimer = undefined;
  }
}

// Makes a connection follow the odds of exactly these pins. The markets come
// from the pins as stored, never from the request. False when there is no such
// connection (it closed, or the page reconnected and will say again).
export async function setLiveOdds(id: string, pinIds: unknown[]): Promise<boolean> {
  const conn = state.connections.get(id);
  if (!conn) return false;
  const wanted = new Set(pinIds.map(Number).filter((pinId) => Number.isInteger(pinId) && pinId > 0).slice(0, MAX_ODDS_PINS));
  conn.oddsWanted = wanted;

  for (const [pinId, stop] of conn.odds) {
    if (!wanted.has(pinId)) {
      stop();
      conn.odds.delete(pinId);
    }
  }
  const added = [...wanted].filter((pinId) => !conn.odds.has(pinId));
  const pins = await Promise.all(added.map((pinId) => pinById(pinId)));
  added.forEach((pinId, i) => {
    // A later request may have changed the set while the pins loaded.
    if (conn.closed || conn.odds.has(pinId) || !conn.oddsWanted.has(pinId)) return;
    const refs = pins[i] ? pinMarketRefs(pins[i]).slice(0, MAX_MARKETS) : [];
    if (!refs.length) {
      conn.send('odds', { pinId, markets: [] });
      conn.odds.set(pinId, () => {});
      return;
    }
    conn.odds.set(
      pinId,
      subscribeOdds(pinId, refs, (markets) => {
        conn.send('odds', { pinId, markets });
        // The read is already paid for: the pin keeps what its markets have
        // traded, for the timeline's weighting (services/pinMarketVolume.ts).
        recordMarketVolume(pinId, markets);
      }),
    );
  });
  return true;
}

// Makes a connection follow the quotes of these pins' tickers, as stored. Asked
// again with the same pins, it re-reads their tickers (one was added or taken
// off). False when there is no such connection.
export async function setLiveStocks(id: string, pinIds: unknown[]): Promise<boolean> {
  const conn = state.connections.get(id);
  if (!conn) return false;
  const wanted = [...new Set(pinIds.map(Number).filter((pinId) => Number.isInteger(pinId) && pinId > 0))].slice(0, MAX_ODDS_PINS);
  conn.stocksWanted = wanted;
  const tickers = await PinTicker.forPins(wanted);
  // A later request may have changed the set while the tickers loaded.
  if (conn.closed || conn.stocksWanted !== wanted) return true;
  const symbols = new Map(tickers.map((t) => [t.symbol, t.assetClass]));
  for (const [symbol, stop] of conn.stocks) {
    if (!symbols.has(symbol)) {
      stop();
      conn.stocks.delete(symbol);
    }
  }
  for (const [symbol, assetClass] of symbols) {
    if (!conn.stocks.has(symbol)) conn.stocks.set(symbol, subscribeQuote(symbol, assetClass, (quote) => conn.send('stock', quote)));
  }
  return true;
}
