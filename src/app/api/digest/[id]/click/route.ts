import type { NextRequest } from 'next/server';
import { publicOrigin, route } from '@/server/http';
import Digest from '@/server/model/digest';

type Ctx = RouteContext<'/api/digest/[id]/click'>;

// A link in the weekly email: counted, then sent on to a path on this site.
// Only a plain site path is followed; anything else goes to the home page, so
// the link cannot be used to send people to another site.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const id = Number((await ctx.params).id);
  const to = request.nextUrl.searchParams.get('to') ?? '';
  const safe = /^\/(?![/\\])[^\s\\]*$/.test(to) && to.length <= 500 ? to : '/';
  if (Number.isInteger(id) && id > 0) await Digest.recordClick(id, safe).catch(() => undefined);
  return Response.redirect(`${publicOrigin(request)}${safe}`, 302);
});
