import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MarketRef } from '@/lib/predictionMarkets';

// The sockets are a live feed of their own; these tests are about what the
// REST reads make of an exchange's answer.
const stream = { watch: () => () => {}, quote: () => undefined, coveredSince: () => undefined };
vi.mock('./kalshiStream', async () => {
  const actual = await vi.importActual<typeof import('./kalshiStream')>('./kalshiStream');
  return { kalshiChance: actual.kalshiChance, kalshiHeaders: () => null, kalshiStream: stream };
});
vi.mock('./polymarketStream', () => ({ polymarketStream: stream }));
vi.mock('./polymarketUsStream', () => ({ polymarketUsHeaders: () => null, polymarketUsStream: stream }));
vi.mock('./util/log', () => ({ default: { warn: vi.fn(), error: vi.fn() } }));

async function load() {
  vi.resetModules();
  delete (globalThis as any).__chronopinMarketOdds;
  return import('./predictionMarkets');
}

function answer(body: unknown) {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })));
}

const kalshiRef: Extract<MarketRef, { source: 'Kalshi' }> = {
  source: 'Kalshi',
  kind: 'event',
  ticker: 'KXTEST-26',
  url: 'https://kalshi.com/markets/kxtest/a-test/kxtest-26',
};

describe('oddsFor: Kalshi volume in dollars', () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.unstubAllGlobals());

  it('prices contracts traded at their last price, per market and for the event', async () => {
    answer({
      event: {
        event_ticker: 'KXTEST-26',
        series_ticker: 'KXTEST',
        title: 'A test',
        markets: [
          { ticker: 'KXTEST-26-A', status: 'active', title: 'A', yes_sub_title: 'A', last_price_dollars: '0.5000', yes_bid_dollars: '0.4900', yes_ask_dollars: '0.5100', volume_fp: '1000', close_time: '2026-12-31T00:00:00Z' },
          { ticker: 'KXTEST-26-B', status: 'active', title: 'B', yes_sub_title: 'B', last_price_dollars: '0.2000', yes_bid_dollars: '0.1900', yes_ask_dollars: '0.2100', volume_fp: '2000', close_time: '2026-12-31T00:00:00Z' },
        ],
      },
    });
    const { oddsFor } = await load();
    const odds = await oddsFor(kalshiRef);
    // 1000 x $0.50 and 2000 x $0.20.
    expect(odds?.outcomes.map((o) => [o.label, o.volume])).toEqual([
      ['A', 500],
      ['B', 400],
    ]);
    expect(odds?.volume).toBe(900);
  });

  it('leaves the volume off when the market reports no contracts', async () => {
    answer({
      event: {
        event_ticker: 'KXTEST-26',
        series_ticker: 'KXTEST',
        title: 'A test',
        markets: [{ ticker: 'KXTEST-26-A', status: 'active', title: 'A', last_price_dollars: '0.5000' }],
      },
    });
    const { oddsFor } = await load();
    const odds = await oddsFor(kalshiRef);
    expect(odds?.volume).toBeUndefined();
  });

  it('reads the older shape, whose price is in cents', async () => {
    answer({
      event: {
        event_ticker: 'KXTEST-26',
        series_ticker: 'KXTEST',
        title: 'A test',
        markets: [{ ticker: 'KXTEST-26-A', status: 'active', title: 'A', last_price: 25, volume: 400 }],
      },
    });
    const { oddsFor } = await load();
    const odds = await oddsFor(kalshiRef);
    expect(odds?.volume).toBe(100);
  });
});
