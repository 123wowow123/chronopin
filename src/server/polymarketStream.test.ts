import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSocket, flush } from './marketSocket.fake';

vi.mock('./util/log', () => ({ default: { warn: vi.fn(), error: vi.fn() } }));

async function load() {
  vi.resetModules();
  delete (globalThis as any)['__chronopinMarketSocket:Polymarket'];
  return import('./polymarketStream');
}

const book = (asset_id: string, bids: string[], asks: string[]) => ({
  event_type: 'book',
  asset_id,
  bids: bids.map((price) => ({ price, size: '10' })),
  asks: asks.map((price) => ({ price, size: '10' })),
  // Not reliably this token's, so never used.
  last_trade_price: '0.400',
});

describe('polymarketChance', () => {
  it('is the midpoint, or the last trade once the spread passes 10c', async () => {
    const { polymarketChance } = await load();
    expect(polymarketChance({ bid: 0.6, ask: 0.61, last: 0.3 })).toBe(0.605);
    expect(polymarketChance({ bid: 0.5, ask: 0.6, last: 0.3 })).toBe(0.55);
    expect(polymarketChance({ bid: 0.2, ask: 0.6, last: 0.3 })).toBe(0.3);
    expect(polymarketChance({ bid: 0.2, ask: 0.6 })).toBeNull();
    expect(polymarketChance({ ask: 0.6, last: 0.58 })).toBe(0.58);
  });
});

describe('polymarketStream', () => {
  beforeEach(() => {
    FakeSocket.sockets = [];
    vi.stubGlobal('WebSocket', FakeSocket);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('subscribes keyless, prices books and changes, and covers a token once priced', async () => {
    const { polymarketStream } = await load();
    polymarketStream.watch(['t1', 't2'], () => {});
    await flush();
    const socket = FakeSocket.last;
    expect(socket.init.headers).toEqual({});
    socket.open();
    await flush();
    expect(socket.sent).toEqual([{ assets_ids: ['t1', 't2'], type: 'market', custom_feature_enabled: true }]);

    socket.reply([book('t1', ['0.59', '0.6'], ['0.62', '0.61']), book('t2', ['0.1'], ['0.9'])]);
    expect(polymarketStream.quote('t1')?.chance).toBe(0.605);
    expect(polymarketStream.coveredSince('t1')).toBeTypeOf('number');
    // A wide book with no trade seen has no price, so REST keeps it.
    expect(polymarketStream.quote('t2')).toBeUndefined();
    expect(polymarketStream.coveredSince('t2')).toBeUndefined();

    socket.reply({ event_type: 'price_change', price_changes: [{ asset_id: 't1', best_bid: '0.7', best_ask: '0.72' }] });
    expect(polymarketStream.quote('t1')?.chance).toBe(0.71);
    socket.reply({ event_type: 'last_trade_price', asset_id: 't2', price: '0.35' });
    expect(polymarketStream.quote('t2')?.chance).toBe(0.35);
    expect(polymarketStream.coveredSince('t2')).toBeTypeOf('number');
    socket.reply('PONG');
  });

  it('adds and removes tokens as operations, never with an empty list', async () => {
    const { polymarketStream } = await load();
    const stop1 = polymarketStream.watch(['t1'], () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    await flush();
    const stop2 = polymarketStream.watch(['t2'], () => {});
    await flush();
    expect(socket.sent[1]).toEqual({ assets_ids: ['t2'], operation: 'subscribe', custom_feature_enabled: true });
    stop1();
    stop2();
    await flush();
    expect(socket.sent[2]).toEqual({ assets_ids: ['t1', 't2'], operation: 'unsubscribe' });
    expect(socket.sent).toHaveLength(3);
  });
});
