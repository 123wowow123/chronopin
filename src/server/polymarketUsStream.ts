// Polymarket US's market data over its authenticated WebSocket, the main feed
// for polymarket.us odds (the socket itself is marketSocket.ts). Markets are
// market slugs. Subscribing sends each market's current price, so a market is
// covered from that first message.
//
// Polymarket US allows 10 subscriptions per connection of up to 100 markets
// each, a market in only one at a time, and no changing a subscription's
// markets: markets are grouped, and a full set of groups is rebuilt
// (unsubscribed, then subscribed again with the new markets) to make room.

import crypto from 'node:crypto';
import config from './config';
import { marketSocket, type Conn } from './marketSocket';
import log from './util/log';

type Json = Record<string, any>;

const WS_URL = 'wss://api.polymarket.us/v1/ws/markets';
const MAX_GROUPS = 10;
const GROUP_SIZE = 100;

let signingKey: crypto.KeyObject | null | undefined;

// The secret is base64 of the Ed25519 seed (32 bytes) and its public key.
function privateKey(): crypto.KeyObject | null {
  if (signingKey === undefined) {
    signingKey = null;
    const seed = Buffer.from(config.polymarketUS.secretKey, 'base64').subarray(0, 32);
    if (config.polymarketUS.keyID && seed.length === 32) {
      try {
        const pkcs8Prefix = Buffer.from('302e020100300506032b657004220420', 'hex');
        signingKey = crypto.createPrivateKey({ key: Buffer.concat([pkcs8Prefix, seed]), format: 'der', type: 'pkcs8' });
      } catch (err) {
        log.error('Polymarket US secret key', (err as Error).message);
      }
    }
  }
  return signingKey;
}

// Polymarket US's signed-request headers for a path (no query string), or
// null without a usable key: an Ed25519 signature of timestamp + method + path.
export function polymarketUsHeaders(method: string, path: string): Record<string, string> | null {
  const key = privateKey();
  if (!key) return null;
  const timestamp = String(Date.now());
  const signature = crypto.sign(null, Buffer.from(timestamp + method + path), key).toString('base64');
  return { 'X-PM-Access-Key': config.polymarketUS.keyID, 'X-PM-Timestamp': timestamp, 'X-PM-Signature': signature };
}

type State = {
  nextId: number;
  // Subscriptions by request id, with their markets.
  groups: Map<string, string[]>;
  // A group being unsubscribed, and the markets to subscribe once it is.
  pending?: { requestId: string; then: string[] };
};

function subscribe(conn: Conn<State>, slugs: string[]) {
  // An empty list subscribes to every market on the exchange.
  if (!slugs.length) return;
  const requestId = `chronopin-${conn.state.nextId++}`;
  conn.state.groups.set(requestId, slugs);
  conn.send({ subscribe: { requestId, subscriptionType: 'SUBSCRIPTION_TYPE_MARKET_DATA_LITE', marketSlugs: slugs } });
}

function unsubscribe(conn: Conn<State>, requestId: string, then: string[] = []) {
  conn.state.pending = { requestId, then };
  conn.uncover(conn.state.groups.get(requestId) ?? []);
  conn.send({ unsubscribe: { requestId } });
}

export const polymarketUsStream = marketSocket<State>({
  name: 'Polymarket US',
  url: WS_URL,
  enabled: () => !!privateKey(),
  headers: () => polymarketUsHeaders('GET', new URL(WS_URL).pathname)!,
  // A text ping draws a PONG; the server sends no heartbeat of its own.
  heartbeatMs: 10_000,
  heartbeat: (conn) => conn.send('ping'),
  initial: () => ({ nextId: 1, groups: new Map() }),
  idle: (conn) => !conn.state.groups.size && !conn.state.pending,

  sync(conn) {
    const { state } = conn;
    if (state.pending) return;
    // A group none of whose markets are watched goes.
    for (const [requestId, slugs] of state.groups) {
      if (!slugs.some((slug) => conn.wants(slug))) return unsubscribe(conn, requestId);
    }
    const grouped = new Set([...state.groups.values()].flat());
    const missing = conn.wanted().filter((slug) => !grouped.has(slug));
    if (!missing.length) return;
    if (state.groups.size < MAX_GROUPS) {
      subscribe(conn, missing.slice(0, GROUP_SIZE));
      if (missing.length > GROUP_SIZE) conn.resync();
      return;
    }
    // Every group in use: rebuild the one with the most room (markets no longer
    // watched count as room). With none, the rest stay on REST.
    let best: { requestId: string; kept: string[] } | undefined;
    for (const [requestId, slugs] of state.groups) {
      const kept = slugs.filter((slug) => conn.wants(slug));
      if (!best || kept.length < best.kept.length) best = { requestId, kept };
    }
    const room = GROUP_SIZE - best!.kept.length;
    if (room > 0) unsubscribe(conn, best!.requestId, [...best!.kept, ...missing.slice(0, room)]);
  },

  receive(conn, data) {
    if (data === 'PONG') return;
    const message: Json = JSON.parse(data);
    const { state } = conn;
    if (message.marketDataLite) {
      const slug = message.marketDataLite.marketSlug;
      // Only from the group that holds it, not one on its way out.
      if (!state.groups.get(message.requestId)?.includes(slug) || state.pending?.requestId === message.requestId) return;
      const chance = Number(message.marketDataLite.currentPx?.value);
      if (!Number.isFinite(chance)) return;
      conn.price(slug, chance);
      conn.cover([slug]);
      return;
    }
    if (message.unsubscribed && message.requestId === state.pending?.requestId) {
      const { requestId, then } = state.pending!;
      state.pending = undefined;
      state.groups.delete(requestId);
      subscribe(conn, then.filter((slug) => conn.wants(slug)));
      conn.resync();
      return;
    }
    if (message.error) {
      if (!state.groups.has(message.requestId)) return log.warn('Polymarket US stream error', message.error);
      // Starting over is simpler than guessing what the connection holds.
      conn.fail(`refused a subscription: ${message.error}`);
    }
  },
});
