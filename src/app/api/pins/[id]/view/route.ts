import { userAgent, type NextRequest } from 'next/server';
import { emitPinEvent } from '@/server/events';
import { intParam, json, noContent, route } from '@/server/http';
import PinView from '@/server/model/pinView';
import { viewerKey } from '@/server/visitor';

type Ctx = RouteContext<'/api/pins/[id]/view'>;

// Counts a view of a pin's page (sent by the page itself, since the page HTML
// is cached). Crawlers are ignored; the stack order on the timeline uses these.
// A new view goes out live, so every open card of the pin shows it. Answers
// with { viewCount } either way: the page itself is cached, its count is not.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  if (userAgent(request).isBot) {
    return noContent();
  }
  const { added, viewCount } = await PinView.record(pinId, await viewerKey(request));
  if (added) emitPinEvent('view', { id: pinId, viewCount });
  return json({ viewCount });
});
