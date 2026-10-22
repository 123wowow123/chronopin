import type { NextRequest } from 'next/server';
import { OKF_VERSION } from '@/lib/okf';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, route } from '@/server/http';
import Company from '@/server/model/company';
import CompanyWiki from '@/server/model/companyWiki';

type Ctx = RouteContext<'/api/companies/[id]/wiki'>;

// The wiki behind a company: the OKF concept (type Organization) its facts are compiled into, each
// statement citing a numbered source. `?path=page` returns markdown; otherwise { okf_version, files }.
// Public: it holds only what the company's page shows.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  const company = await Company.getById(id);
  if (!company) throw new HttpError(404, 'Not Found');
  let page = await CompanyWiki.page(id);
  if (!page && (await CompanyWiki.rebuild(id))) page = await CompanyWiki.page(id);
  if (!page) throw new HttpError(404, 'Not Found');
  const headers = { 'Cache-Control': 'public, max-age=300' };
  if (request.nextUrl.searchParams.get('path') === 'page') return new Response(page, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...headers } });
  return json({ okf_version: OKF_VERSION, files: { [`companies/${id}.md`]: page } }, 200, headers);
});

// Compiles the wiki again from what is stored. Admin only.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const id = intParam((await ctx.params).id);
  if (!(await CompanyWiki.rebuild(id))) throw new HttpError(404, 'Not Found');
  return json({ id });
});
