import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { userAgent, type NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { intParam, noContent, route } from '@/server/http';
import PinView from '@/server/model/pinView';

type Ctx = RouteContext<'/api/pins/[id]/view'>;

// An anonymous visitor's id, so a guest reloading a pin counts once a day.
const VISITOR_COOKIE = 'vid';
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

// Counts a view of a pin's page (sent by the page itself, since the page HTML
// is cached). Crawlers are ignored; the stack order on the timeline uses these.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  if (userAgent(request).isBot) {
    return noContent();
  }

  const user = await getUser(request);
  let viewer: string;
  if (user) {
    viewer = `u:${user.id}`;
  } else {
    const jar = await cookies();
    let visitor = jar.get(VISITOR_COOKIE)?.value;
    if (!visitor || !/^[0-9a-f-]{36}$/.test(visitor)) {
      visitor = randomUUID();
      jar.set({
        name: VISITOR_COOKIE,
        value: visitor,
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: VISITOR_MAX_AGE,
      });
    }
    viewer = `v:${visitor}`;
  }

  await PinView.record(pinId, viewer);
  return noContent();
});
