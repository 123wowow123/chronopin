import type { NextRequest } from 'next/server';
import { intParam, noContent } from '@/server/http';
import Pin from '@/server/model/pin';
import { subscribeOdds } from '@/server/predictionMarkets';
import { pinMarketRefs } from '@/lib/predictionMarkets';

// A pin links to at most a handful of markets; more would be a scrape.
const MAX_MARKETS = 4;

// Live odds from the Kalshi and Polymarket markets a pin cites, as Server-Sent
// Events: `event: odds` with the markets as JSON, first on connecting and then
// on every refresh while the page stays open. 204 (which tells EventSource not
// to reconnect) when the pin cites no market.
export async function GET(request: NextRequest, ctx: RouteContext<'/api/pins/[id]/odds/stream'>) {
  const { pin } = await Pin.queryById(intParam((await ctx.params).id));
  if (!pin) {
    return new Response(null, { status: 404 });
  }
  const refs = pinMarketRefs(pin).slice(0, MAX_MARKETS);
  if (!refs.length) {
    return noContent();
  }

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send('retry: 5000\n\n');

      const unsubscribe = subscribeOdds(pin.id, refs, (odds) => send(`event: odds\ndata: ${JSON.stringify(odds)}\n\n`));
      // Comments keep proxies from closing a connection between pushes.
      const keepAlive = setInterval(() => send(': keep-alive\n\n'), 25_000);

      cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };
      request.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
