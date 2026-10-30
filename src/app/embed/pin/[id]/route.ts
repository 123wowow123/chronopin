import { renderMissingWidget, renderWidget, parseWidgetOptions } from '@/lib/widget';
import { pinById, threadPins } from '@/server/services/pages';

// The pin widget a blog shows in an iframe (src/lib/widget.ts): a countdown
// or the pin's thread, linking back to the pin page. It is outside the
// language routing and the cookie gate (src/proxy.ts skips /embed/), because
// a third-party iframe keeps no cookies. No frame-blocking header is sent;
// the page is public and made to be framed anywhere.
export async function GET(request: Request, ctx: RouteContext<'/embed/pin/[id]'>) {
  const id = Number((await ctx.params).id);
  const options = parseWidgetOptions(new URL(request.url).searchParams);
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': 'frame-ancestors *',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  const pin = Number.isInteger(id) && id > 0 ? await pinById(id, options.lang) : null;
  if (!pin) {
    return new Response(renderMissingWidget(id, options), { status: 404, headers: { ...headers, 'Cache-Control': 'public, max-age=300' } });
  }
  const thread = options.view === 'thread' ? await threadPins(id, options.lang) : [];
  return new Response(renderWidget(pin, thread, options), {
    headers: { ...headers, 'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600' },
  });
}
