import { after, userAgent, type NextRequest } from 'next/server';
import { emitPinEvent } from '@/server/events';
import { intParam, json, noContent, route } from '@/server/http';
import PinView from '@/server/model/pinView';
import UserWiki from '@/server/model/userWiki';
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
  const viewer = await viewerKey(request);
  const { added, viewCount } = await PinView.record(pinId, viewer);
  if (added) emitPinEvent('view', { id: pinId, viewCount });
  // A signed-in open is a signal for their preference wiki.
  if (added && viewer.startsWith('u:')) after(() => UserWiki.rebuildQuietly(Number(viewer.slice(2))));
  return json({ viewCount });
});
