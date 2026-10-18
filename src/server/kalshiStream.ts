// Kalshi's live market ticker over its authenticated WebSocket, the main feed
// for Kalshi odds (the socket itself is marketSocket.ts). The ticker sends
// only changes, never a snapshot, so a market counts as covered from its
// subscription's ack and its starting price is the REST read's.

import crypto from 'node:crypto';
import config from './config';
import { marketSocket, type Conn } from './marketSocket';
import log from './util/log';

type Json = Record<string, any>;

const WS_URL = 'wss://external-api-ws.kalshi.com/trade-api/ws/v2';

function num(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

// Kalshi quotes in dollars per $1 contract, so a price is the chance. The last
// trade is what kalshi.com shows; the bid/ask midpoint stands in before one.
export function kalshiChance(market: Json): number | null {
  if (market.result === 'yes') return 1;
  if (market.result === 'no') return 0;
  const last = num(market.last_price_dollars) ?? (num(market.last_price) ?? NaN) / 100;
  if (last > 0) return last;
  const bid = num(market.yes_bid_dollars) ?? (num(market.yes_bid) ?? NaN) / 100;
  const ask = num(market.yes_ask_dollars) ?? (num(market.yes_ask) ?? NaN) / 100;
  return bid > 0 && ask > 0 ? (bid + ask) / 2 : null;
}

let signingKey: crypto.KeyObject | null | undefined;

function privateKey(): crypto.KeyObject | null {
  if (signingKey === undefined) {
    signingKey = null;
    if (config.kalshi.keyID && config.kalshi.privateKey) {
      try {
        signingKey = crypto.createPrivateKey(config.kalshi.privateKey);
      } catch (err) {
        log.error('Kalshi private key', (err as Error).message);
      }
    }
  }
  return signingKey;
}

// Kalshi's signed-request headers for a path (no query string), or null
// without a usable key: an RSA-PSS SHA-256 signature of timestamp + method +
// path.
export function kalshiHeaders(method: string, path: string): Record<string, string> | null {
  const key = privateKey();
  if (!key) return null;
  const timestamp = String(Date.now());
  const signature = crypto
    .sign('sha256', Buffer.from(timestamp + method + path), {
      key,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST,
    })
    .toString('base64');
  return { 'KALSHI-ACCESS-KEY': config.kalshi.keyID, 'KALSHI-ACCESS-TIMESTAMP': timestamp, 'KALSHI-ACCESS-SIGNATURE': signature };
}

type State = {
  nextId: number;
  // The ticker subscription, once Kalshi has confirmed it.
  sid?: number;
  // The markets it holds.
  subscribed: Set<string>;
  // Commands go one at a time, each once the last is answered.
  pending?: { id: number; cmd: string; tickers: string[] };
};

function send(conn: Conn<State>, cmd: string, params: Json) {
  const id = conn.state.nextId++;
  conn.state.pending = { id, cmd: params.action ?? cmd, tickers: params.market_tickers ?? [] };
  conn.send({ id, cmd, params });
}

// Markets are tickers.
export const kalshiStream = marketSocket<State>({
  name: 'Kalshi',
  url: WS_URL,
  enabled: () => !!privateKey(),
  headers: () => kalshiHeaders('GET', new URL(WS_URL).pathname)!,
  // list_subscriptions always draws an answer.
  heartbeatMs: 30_000,
  heartbeat: (conn) => conn.send({ id: conn.state.nextId++, cmd: 'list_subscriptions' }),
  initial: () => ({ nextId: 1, subscribed: new Set() }),
  idle: (conn) => conn.state.sid === undefined && !conn.state.pending,

  // One command towards the watched markets.
  sync(conn) {
    const { state } = conn;
    if (state.pending) return;
    const wanted = conn.wanted();
    if (!wanted.length) {
      if (state.sid !== undefined) send(conn, 'unsubscribe', { sids: [state.sid] });
      return;
    }
    if (state.sid === undefined) {
      send(conn, 'subscribe', { channels: ['ticker'], market_tickers: wanted });
      return;
    }
    const add = wanted.filter((ticker) => !state.subscribed.has(ticker));
    if (add.length) {
      send(conn, 'update_subscription', { sids: [state.sid], action: 'add_markets', market_tickers: add });
      return;
    }
    // Only once every wanted market is subscribed, so this never empties the
    // list: a ticker subscription with no markets sends every market on
    // Kalshi. (Nothing wanted unsubscribes instead, above.)
    const remove = [...state.subscribed].filter((ticker) => !conn.wants(ticker));
    if (remove.length) send(conn, 'update_subscription', { sids: [state.sid], action: 'delete_markets', market_tickers: remove });
  },

  receive(conn, data) {
    const { state } = conn;
    const message: Json = JSON.parse(data);
    if (message.type === 'ticker') {
      const { market_ticker, price_dollars, yes_bid_dollars, yes_ask_dollars } = message.msg ?? {};
      conn.price(market_ticker, kalshiChance({ last_price_dollars: price_dollars, yes_bid_dollars, yes_ask_dollars }));
      return;
    }
    const pending = state.pending;
    if (!pending || message.id !== pending.id) {
      if (message.type === 'error') log.warn('Kalshi stream error', JSON.stringify(message.msg));
      return;
    }
    state.pending = undefined;
    if (message.type === 'error') {
      // Starting over is simpler than guessing what the subscription holds.
      conn.fail(`refused ${pending.cmd}: ${JSON.stringify(message.msg)}`);
      return;
    }
    if (pending.cmd === 'subscribe') {
      state.sid = message.msg.sid;
      pending.tickers.forEach((ticker) => state.subscribed.add(ticker));
      conn.cover(pending.tickers);
    } else if (pending.cmd === 'add_markets') {
      pending.tickers.forEach((ticker) => state.subscribed.add(ticker));
      conn.cover(pending.tickers);
    } else if (pending.cmd === 'delete_markets') {
      pending.tickers.forEach((ticker) => state.subscribed.delete(ticker));
      conn.uncover(pending.tickers);
    } else if (pending.cmd === 'unsubscribe') {
      state.sid = undefined;
      conn.uncover(state.subscribed);
      state.subscribed.clear();
    }
    conn.resync();
  },
});
