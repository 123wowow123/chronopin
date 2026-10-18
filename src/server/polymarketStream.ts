// Polymarket's public market channel (no key), the main feed for
// polymarket.com odds (the socket itself is marketSocket.ts). Markets are
// outcome token ids, the ones Gamma's clobTokenIds list. Subscribing sends
// each token's order book, so a token is covered from its first book with a
// price.

import { marketSocket, type Conn } from './marketSocket';

type Json = Record<string, any>;

// Well above what a page follows (40 pins, a few markets each); past it, the
// rest stay on REST.
const MAX_TOKENS = 500;

type Book = { bid?: number; ask?: number; last?: number; full: boolean };

type State = {
  subscribed: Set<string>;
  books: Map<string, Book>;
  // The first subscription is its own message shape; later ones are
  // operations on it.
  started: boolean;
};

function num(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

// What polymarket.com shows (and Gamma's outcomePrices hold): the midpoint of
// the best bid and ask, or the last trade once the spread is wider than 10c.
export function polymarketChance(book: Omit<Book, 'full'>): number | null {
  const { bid, ask, last } = book;
  if (bid !== undefined && ask !== undefined && ask - bid <= 0.1 + 1e-9) return Math.round(((bid + ask) / 2) * 1e6) / 1e6;
  return last ?? null;
}

function update(conn: Conn<State>, token: string, change: Partial<Book>) {
  if (!conn.state.subscribed.has(token)) return;
  const known = conn.state.books.get(token);
  // A whole book replaces the sides; an update only changes what it gives.
  const base: Book = change.full ? { full: true, last: known?.last } : (known ?? { full: false });
  const given = Object.fromEntries(Object.entries(change).filter(([, value]) => value !== undefined));
  const book: Book = { ...base, ...given };
  conn.state.books.set(token, book);
  const chance = polymarketChance(book);
  conn.price(token, chance);
  if (book.full && chance != null) conn.cover([token]);
}

export const polymarketStream = marketSocket<State>({
  name: 'Polymarket',
  url: 'wss://ws-subscriptions-clob.polymarket.com/ws/market',
  enabled: () => true,
  headers: () => ({}),
  heartbeatMs: 10_000,
  heartbeat: (conn) => conn.send('PING'),
  initial: () => ({ subscribed: new Set(), books: new Map(), started: false }),
  idle: (conn) => !conn.state.subscribed.size,

  sync(conn) {
    const { state } = conn;
    const remove = [...state.subscribed].filter((token) => !conn.wants(token));
    if (remove.length) {
      conn.send({ assets_ids: remove, operation: 'unsubscribe' });
      for (const token of remove) {
        state.subscribed.delete(token);
        state.books.delete(token);
      }
      conn.uncover(remove);
    }
    const add = conn
      .wanted()
      .filter((token) => !state.subscribed.has(token))
      .slice(0, Math.max(0, MAX_TOKENS - state.subscribed.size));
    // Never an empty list, whatever the exchange would make of one.
    if (!add.length) return;
    conn.send(state.started ? { assets_ids: add, operation: 'subscribe', custom_feature_enabled: true } : { assets_ids: add, type: 'market', custom_feature_enabled: true });
    state.started = true;
    add.forEach((token) => state.subscribed.add(token));
  },

  receive(conn, data) {
    if (data === 'PONG') return;
    const messages: Json[] = [].concat(JSON.parse(data));
    for (const message of messages) {
      switch (message.event_type) {
        case 'book': {
          // The whole book: bids rise to the best, asks fall to it. (Its
          // last_trade_price isn't reliably this token's, so it's left out.)
          const bids = (message.bids ?? []).map((level: Json) => num(level.price)).filter((p: unknown) => p !== undefined);
          const asks = (message.asks ?? []).map((level: Json) => num(level.price)).filter((p: unknown) => p !== undefined);
          update(conn, message.asset_id, { bid: bids.length ? Math.max(...bids) : undefined, ask: asks.length ? Math.min(...asks) : undefined, full: true });
          break;
        }
        case 'price_change':
          for (const change of message.price_changes ?? []) update(conn, change.asset_id, { bid: num(change.best_bid), ask: num(change.best_ask) });
          break;
        case 'best_bid_ask':
          update(conn, message.asset_id, { bid: num(message.best_bid), ask: num(message.best_ask) });
          break;
        case 'last_trade_price':
          update(conn, message.asset_id, { last: num(message.price) });
          break;
        case 'market_resolved':
          for (const token of message.assets_ids ?? []) {
            const won = token === message.winning_asset_id ? 1 : 0;
            update(conn, token, { bid: won, ask: won, last: won });
          }
          break;
      }
    }
  },
});
