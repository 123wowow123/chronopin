import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSocket, flush } from './marketSocket.fake';
import type { Conn } from './marketSocket';

vi.mock('./util/log', () => ({ default: { warn: vi.fn(), error: vi.fn() } }));

type State = { subscribed: string[] };

// A protocol that subscribes every wanted market at once and prices them from
// {id, chance} messages.
async function load(enabled = true) {
  vi.resetModules();
  delete (globalThis as any)['__chronopinMarketSocket:Test'];
  const { marketSocket } = await import('./marketSocket');
  return marketSocket<State>({
    name: 'Test',
    url: 'wss://example.test/ws',
    enabled: () => enabled,
    headers: () => ({ auth: 'yes' }),
    heartbeatMs: 10_000,
    heartbeat: (conn) => conn.send('ping'),
    initial: () => ({ subscribed: [] }),
    idle: (conn) => !conn.state.subscribed.length,
    sync(conn: Conn<State>) {
      conn.state.subscribed = conn.wanted();
      conn.send({ subscribe: conn.state.subscribed });
    },
    receive(conn, data) {
      const { id, chance } = JSON.parse(data);
      conn.price(id, chance);
      conn.cover([id]);
    },
  });
}

describe('marketSocket', () => {
  beforeEach(() => {
    FakeSocket.sockets = [];
    vi.stubGlobal('WebSocket', FakeSocket);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens nothing when the stream is off', async () => {
    const stream = await load(false);
    stream.watch(['a'], () => {});
    await flush();
    expect(FakeSocket.sockets).toHaveLength(0);
  });

  it('connects with the headers, and covers and prices a market from the socket', async () => {
    const stream = await load();
    const watcher = vi.fn();
    stream.watch(['a'], watcher);
    await flush();
    const socket = FakeSocket.last;
    expect(socket.init.headers).toEqual({ auth: 'yes' });
    socket.open();
    await flush();
    expect(socket.sent).toEqual([{ subscribe: ['a'] }]);

    socket.reply({ id: 'a', chance: 0.4 });
    socket.reply({ id: 'a', chance: 0.4 });
    socket.reply({ id: 'b', chance: 0.9 });
    expect(stream.quote('a')?.chance).toBe(0.4);
    expect(stream.coveredSince('a')).toBeTypeOf('number');
    expect(stream.quote('b')).toBeUndefined();
    // Only a change calls the watcher.
    expect(watcher).toHaveBeenCalledTimes(1);
  });

  it('uncovers everything when the socket closes, and reconnects with backoff', async () => {
    const stream = await load();
    stream.watch(['a'], () => {});
    await flush();
    FakeSocket.last.open();
    await flush();
    FakeSocket.last.reply({ id: 'a', chance: 0.4 });

    FakeSocket.last.onclose?.({ code: 1006 });
    expect(stream.coveredSince('a')).toBeUndefined();
    // The last quote stays, for a REST read to be compared with.
    expect(stream.quote('a')?.chance).toBe(0.4);
    await vi.advanceTimersByTimeAsync(999);
    expect(FakeSocket.sockets).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeSocket.sockets).toHaveLength(2);

    FakeSocket.last.onclose?.({ code: 1006 });
    await vi.advanceTimersByTimeAsync(1999);
    expect(FakeSocket.sockets).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeSocket.sockets).toHaveLength(3);
  });

  it('pings, and drops a socket silent for two beats', async () => {
    const stream = await load();
    stream.watch(['a'], () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    await flush();
    socket.reply({ id: 'a', chance: 0.4 });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(socket.sent).toContain('ping');
    await vi.advanceTimersByTimeAsync(20_000);
    expect(socket.readyState).toBe(FakeSocket.CLOSED);
    expect(stream.coveredSince('a')).toBeUndefined();
  });

  it('forgets a market once unwatched, and closes the idle socket', async () => {
    const stream = await load();
    const stop = stream.watch(['a'], () => {});
    await flush();
    const socket = FakeSocket.last;
    socket.open();
    await flush();
    socket.reply({ id: 'a', chance: 0.4 });
    stop();
    await flush();
    expect(stream.quote('a')).toBeUndefined();
    expect(stream.coveredSince('a')).toBeUndefined();
    expect(socket.sent[socket.sent.length - 1]).toEqual({ subscribe: [] });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(socket.readyState).toBe(FakeSocket.CLOSED);
  });
});
