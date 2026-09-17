import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSocket, flush } from './marketSocket.fake';

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const kalshi = { keyID: 'key-id', privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }) as string };
vi.mock('./config', () => ({ default: { kalshi } }));
vi.mock('./util/log', () => ({ default: { warn: vi.fn(), error: vi.fn() } }));

async function load() {
  vi.resetModules();
  delete (globalThis as any)['__chronopinMarketSocket:Kalshi'];
  return import('./kalshiStream');
}

// Acknowledges the last command the way Kalshi does.
function ack(socket: FakeSocket, sid = 1) {
  const { id, cmd, params } = socket.sent[socket.sent.length - 1];
  const type = cmd === 'subscribe' ? 'subscribed' : cmd === 'unsubscribe' ? 'unsubscribed' : 'ok';
  socket.reply({ type, id, sid, msg: { channel: 'ticker', sid, market_tickers: params?.market_tickers } });
}

describe('kalshiStream', () => {
  beforeEach(() => {
    FakeSocket.sockets = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    kalshi.keyID = 'key-id';
  });
  afterEach(() => vi.unstubAllGlobals());

  it('signs the handshake with the key id and an RSA-PSS signature of the path', async () => {
    const { kalshiStream } = await load();
    kalshiStream.watch(['A'], () => {});
    await flush();
    const { headers } = FakeSocket.last.init;
    expect(headers['KALSHI-ACCESS-KEY']).toBe('key-id');
    const signed = Buffer.from(headers['KALSHI-ACCESS-TIMESTAMP'] + 'GET/trade-api/ws/v2');
    const signature = Buffer.from(headers['KALSHI-ACCESS-SIGNATURE'], 'base64');
    const key = { key: crypto.createPublicKey(privateKey), padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 };
    expect(crypto.verify('sha256', signed, key, signature)).toBe(true);
  });

  it('opens no socket without a key', async () => {
    kalshi.keyID = '';
    const { kalshiStream, kalshiHeaders } = await load();
    kalshiStream.watch(['A'], () => {});
    await flush();
    expect(FakeSocket.sockets).toHaveLength(0);
    expect(kalshiHeaders('GET', '/x')).toBeNull();
  });

  it('subscribes, adds and removes markets one command at a time, and prices ticks', async () => {
    const { kalshiStream } = await load();
    const stopA = kalshiStream.watch(['A'], () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    await flush();
    expect(socket.sent).toEqual([{ id: expect.any(Number), cmd: 'subscribe', params: { channels: ['ticker'], market_tickers: ['A'] } }]);
    expect(kalshiStream.coveredSince('A')).toBeUndefined();

    const watcher = vi.fn();
    kalshiStream.watch(['B'], watcher);
    await flush();
    expect(socket.sent).toHaveLength(1);
    ack(socket, 7);
    await flush();
    expect(kalshiStream.coveredSince('A')).toBeTypeOf('number');
    expect(socket.sent[1]).toMatchObject({ cmd: 'update_subscription', params: { sids: [7], action: 'add_markets', market_tickers: ['B'] } });
    ack(socket, 7);

    socket.reply({ type: 'ticker', sid: 7, msg: { market_ticker: 'B', price_dollars: '0.4200', yes_bid_dollars: '0.4100', yes_ask_dollars: '0.4300' } });
    expect(kalshiStream.quote('B')?.chance).toBe(0.42);
    expect(watcher).toHaveBeenCalledTimes(1);
    // No trade yet: the midpoint.
    socket.reply({ type: 'ticker', sid: 7, msg: { market_ticker: 'B', price_dollars: '0.0000', yes_bid_dollars: '0.2000', yes_ask_dollars: '0.3000' } });
    expect(kalshiStream.quote('B')?.chance).toBe(0.25);

    stopA();
    await flush();
    expect(socket.sent[2]).toMatchObject({ cmd: 'update_subscription', params: { action: 'delete_markets', market_tickers: ['A'] } });
  });

  // A ticker subscription whose market list is emptied streams every market.
  it('unsubscribes rather than deleting the last market', async () => {
    const { kalshiStream } = await load();
    const stop = kalshiStream.watch(['A', 'B'], () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    await flush();
    ack(socket, 3);
    stop();
    await flush();
    expect(socket.sent[1]).toEqual({ id: expect.any(Number), cmd: 'unsubscribe', params: { sids: [3] } });
    expect(socket.sent.some((c) => c.params?.action === 'delete_markets')).toBe(false);
  });

  it('starts over when Kalshi refuses a command', async () => {
    const { kalshiStream } = await load();
    kalshiStream.watch(['A'], () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    await flush();
    socket.reply({ type: 'error', id: socket.sent[0].id, msg: { code: 8, msg: 'Unknown channel name' } });
    expect(socket.readyState).toBe(FakeSocket.CLOSED);
  });
});
