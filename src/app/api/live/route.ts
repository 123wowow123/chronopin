import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { closeLiveConnection, openLiveConnection } from '@/server/liveFeed';
import { timeZoneOrUtc } from '@/server/viewer';

// The one live stream a page holds, as Server-Sent Events: pin changes, the
// odds of the pins it shows and, when signed in, the viewer's unread
// notification count (see src/server/liveFeed.ts for the events).
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  const timeZone = timeZoneOrUtc(request.cookies.get('tz')?.value);
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let open = true;
      const write = (chunk: string) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      write('retry: 5000\n\n');

      const conn = openLiveConnection({
        userId: user ? Number(user.id) : null,
        timeZone,
        send: (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
      });
      // Keeps proxies from closing a connection between pushes, and is an
      // event rather than a comment so the page can see it: a phone that
      // slept can hold a stream that reads as open but carries nothing, and
      // a missing ping is how the page tells (src/lib/client/liveFeed.ts).
      const keepAlive = setInterval(() => write('event: ping\ndata: 0\n\n'), 25_000);

      cleanup = () => {
        open = false;
        clearInterval(keepAlive);
        closeLiveConnection(conn);
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
