import { PIN_EVENTS, onPinEvent } from '@/server/events';

// Live pin changes as Server-Sent Events, replacing the socket.io broadcast:
// each change arrives as `event: pin:save|update|remove|...` with the pin as
// JSON data. The listeners are in-process, which is right while the app runs
// as a single replica; several replicas would need Postgres LISTEN/NOTIFY.
export async function GET(request: Request) {
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

      const unsubscribers = PIN_EVENTS.map((event) =>
        onPinEvent(event, (pin) => send(`event: pin:${event}\ndata: ${JSON.stringify(pin)}\n\n`)),
      );
      // Comments keep proxies from closing an idle connection.
      const keepAlive = setInterval(() => send(': keep-alive\n\n'), 25_000);

      cleanup = () => {
        clearInterval(keepAlive);
        unsubscribers.forEach((off) => off());
      };
      request.signal.addEventListener('abort', () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
      send('retry: 5000\n\n');
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
