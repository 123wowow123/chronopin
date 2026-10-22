import type { NextRequest } from 'next/server';
import { OKF_VERSION } from '@/lib/okf';
import { requireRole } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import GovWiki from '@/server/model/govWiki';

type Ctx = RouteContext<'/api/trade-filings/[chamber]/[filingId]/wiki'>;
const KEY = /^(house|senate|executive):[\w.-]{1,50}$/;

// The wiki of one trade filing (a House or Senate periodic transaction report, or an OGE 278-T): an OKF
// concept (type Report) with its trades, sectors and the possible conflicts marked. Public and stable, so it
// can be cited as a reference. `?path=page` returns markdown.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const { chamber, filingId } = await ctx.params;
  const key = `${chamber}:${filingId}`;
  if (!KEY.test(key)) throw new HttpError(404, 'Not Found');
  let page = await GovWiki.page('filing', key);
  if (!page && (await GovWiki.rebuildFilings(key))) page = await GovWiki.page('filing', key);
  if (!page) throw new HttpError(404, 'Not Found');
  const headers = { 'Cache-Control': 'public, max-age=300' };
  if (request.nextUrl.searchParams.get('path') === 'page') return new Response(page, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...headers } });
  return json({ okf_version: OKF_VERSION, files: { [`trade-filings/${chamber}-${filingId}.md`]: page } }, 200, headers);
});

// Compiles it again. Admin only.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const { chamber, filingId } = await ctx.params;
  const key = `${chamber}:${filingId}`;
  if (!KEY.test(key) || !(await GovWiki.rebuildFilings(key))) throw new HttpError(404, 'Not Found');
  return json({ key });
});
