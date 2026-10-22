import type { NextRequest } from 'next/server';
import { OKF_VERSION } from '@/lib/okf';
import { requireRole } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import GovWiki from '@/server/model/govWiki';

type Ctx = RouteContext<'/api/committees/[committeeId]/wiki'>;
const ID = /^[A-Z]{2,4}\d{0,3}$/;

// The wiki of a congressional committee or subcommittee (Thomas id, e.g. HSAS, HSAS03): an OKF concept
// (type Committee) with its members, the sectors it oversees and the trades it marks. Public, and a stable
// URL, so a pin or a person can cite it as a reference. `?path=page` returns markdown.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const id = (await ctx.params).committeeId.toUpperCase();
  if (!ID.test(id)) throw new HttpError(404, 'Not Found');
  let page = await GovWiki.page('committee', id);
  if (!page && (await GovWiki.rebuildCommittees(id))) page = await GovWiki.page('committee', id);
  if (!page) throw new HttpError(404, 'Not Found');
  const headers = { 'Cache-Control': 'public, max-age=300' };
  if (request.nextUrl.searchParams.get('path') === 'page') return new Response(page, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...headers } });
  return json({ okf_version: OKF_VERSION, files: { [`committees/${id}.md`]: page } }, 200, headers);
});

// Compiles it again. Admin only.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const id = (await ctx.params).committeeId.toUpperCase();
  if (!ID.test(id) || !(await GovWiki.rebuildCommittees(id))) throw new HttpError(404, 'Not Found');
  return json({ id });
});
