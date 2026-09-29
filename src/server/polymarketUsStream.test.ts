import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSocket, flush } from './marketSocket.fake';

const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
// As Polymarket US issues it: base64 of the 32-byte seed and the public key.
const seed = privateKey.export({ format: 'der', type: 'pkcs8' }).subarray(-32);
const raw = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
const polymarketUS = { keyID: 'key-id', secretKey: Buffer.concat([seed, raw]).toString('base64') };
vi.mock('./config', () => ({ default: { polymarketUS } }));
vi.mock('./util/log', () => ({ default: { warn: vi.fn(), error: vi.fn() } }));

async function load() {
  vi.resetModules();
  delete (globalThis as any)['__chronopinMarketSocket:Polymarket US'];
  return import('./polymarketUsStream');
}

const data = (requestId: string, marketSlug: string, value: string) => ({
  requestId,
  subscriptionType: 'SUBSCRIPTION_TYPE_MARKET_DATA_LITE',
  marketDataLite: { marketSlug, currentPx: { value, currency: 'USD' } },
});

const slugs = (from: number, count: number) => Array.from({ length: count }, (_, i) => `m${from + i}`);

describe('polymarketUsStream', () => {
  beforeEach(() => {
    FakeSocket.sockets = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    polymarketUS.keyID = 'key-id';
  });
  afterEach(() => vi.unstubAllGlobals());

  it('signs the handshake with an Ed25519 signature of the path', async () => {
    const { polymarketUsStream } = await load();
    polymarketUsStream.watch(['m0'], () => {});
    await flush();
    const { headers } = FakeSocket.last.init;
    expect(headers['X-PM-Access-Key']).toBe('key-id');
    const signed = Buffer.from(headers['X-PM-Timestamp'] + 'GET/v1/ws/markets');
    expect(crypto.verify(null, signed, publicKey, Buffer.from(headers['X-PM-Signature'], 'base64'))).toBe(true);
  });

  it('opens no socket without a key', async () => {
    polymarketUS.keyID = '';
    const { polymarketUsStream, polymarketUsHeaders } = await load();
    polymarketUsStream.watch(['m0'], () => {});
    await flush();
    expect(FakeSocket.sockets).toHaveLength(0);
    expect(polymarketUsHeaders('GET', '/x')).toBeNull();
  });

  it('prices and covers a market from its subscription, and pings', async () => {
    const { polymarketUsStream } = await load();
    polymarketUsStream.watch(['m0', 'm1'], () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    await flush();
    const [{ subscribe }] = socket.sent;
    expect(subscribe).toEqual({ requestId: expect.any(String), subscriptionType: 'SUBSCRIPTION_TYPE_MARKET_DATA_LITE', marketSlugs: ['m0', 'm1'] });
    socket.reply(data(subscribe.requestId, 'm0', '0.8795'));
    expect(polymarketUsStream.quote('m0')?.chance).toBe(0.8795);
    expect(polymarketUsStream.coveredSince('m0')).toBeTypeOf('number');
    expect(polymarketUsStream.coveredSince('m1')).toBeUndefined();
    // Another subscription's data for the market doesn't count.
    socket.reply(data('someone-else', 'm1', '0.5'));
    expect(polymarketUsStream.quote('m1')).toBeUndefined();
    socket.reply('PONG');
  });

  it('groups markets 100 to a subscription, 10 at most, then rebuilds a group to fit more', async () => {
    const { polymarketUsStream } = await load();
    polymarketUsStream.watch(slugs(0, 950), () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    for (let i = 0; i < 12; i++) await flush();
    const subscriptions = socket.sent.map((m) => m.subscribe);
    expect(subscriptions).toHaveLength(10);
    expect(subscriptions.map((s) => s.marketSlugs.length)).toEqual([100, 100, 100, 100, 100, 100, 100, 100, 100, 50]);

    // The last group has room: it is unsubscribed, then subscribed again with
    // the new markets once Polymarket US confirms.
    polymarketUsStream.watch(['new'], () => {});
    await flush();
    const last = subscriptions[9].requestId;
    expect(socket.sent[10]).toEqual({ unsubscribe: { requestId: last } });
    socket.reply(data(last, 'm900', '0.5'));
    expect(polymarketUsStream.quote('m900')).toBeUndefined();
    socket.reply({ requestId: last, unsubscribed: true });
    await flush();
    expect(socket.sent[11].subscribe.marketSlugs).toEqual([...slugs(900, 50), 'new']);
  });

  it('unsubscribes a group none of whose markets are watched, and never subscribes to none', async () => {
    const { polymarketUsStream } = await load();
    const stop = polymarketUsStream.watch(['m0'], () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    await flush();
    const { requestId } = socket.sent[0].subscribe;
    stop();
    await flush();
    expect(socket.sent[1]).toEqual({ unsubscribe: { requestId } });
    socket.reply({ requestId, unsubscribed: true });
    await flush();
    expect(socket.sent).toHaveLength(2);
  });

  it('starts over when a subscription is refused', async () => {
    const { polymarketUsStream } = await load();
    polymarketUsStream.watch(['m0'], () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    await flush();
    socket.reply({ requestId: socket.sent[0].subscribe.requestId, error: 'max subscriptions per connection reached' });
    expect(socket.readyState).toBe(FakeSocket.CLOSED);
  });
});
