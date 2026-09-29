import type { NextRequest } from 'next/server';
import { OKF_VERSION } from '@/lib/okf';
import { isAdmin, requireUser } from '@/server/auth';
import { HttpError, intParam, json, route } from '@/server/http';
import UserWiki from '@/server/model/userWiki';

type Ctx = RouteContext<'/api/users/[id]/wiki'>;

// A user's preference wiki (src/lib/userWiki.ts) as an OKF bundle. It is
// their pin history, so only they and admins may read it.
// GET /api/users/:id/wiki                {okf_version, profile, files: {path: markdown}}
// GET /api/users/:id/wiki?path=page      their concept page, as text/markdown
// POST /api/users/:id/wiki               rebuild it now
async function allowed(request: NextRequest, ctx: Ctx) {
  const user = await requireUser(request);
  const userId = intParam((await ctx.params).id);
  if (user.id !== userId && !isAdmin(user)) {
    throw new HttpError(403, 'Forbidden');
  }
  return userId;
}

export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const userId = await allowed(request, ctx);
  const files = await UserWiki.bundle([userId]);
  const page = [...files.keys()].find((path) => path.startsWith('users/') && path !== 'users/index.md');
  if (!page) {
    throw new HttpError(404, 'Not Found');
  }
  const path = request.nextUrl.searchParams.get('path');
  if (path) {
    const file = files.get(path === 'page' ? page : path.replace(/^\//, ''));
    if (file === undefined) {
      throw new HttpError(404, 'Not Found');
    }
    return new Response(file, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
  }
  return json({ okf_version: OKF_VERSION, profile: await UserWiki.preference(userId), files: Object.fromEntries(files) });
});

export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const userId = await allowed(request, ctx);
  if (!(await UserWiki.rebuild(userId))) {
    throw new HttpError(404, 'Not Found');
  }
  return json({ profile: await UserWiki.preference(userId) }, 201);
});
