import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import Company from '@/server/model/company';

type Ctx = RouteContext<'/api/companies/[id]/parent'>;

async function companyId(ctx: Ctx): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, '', { message: 'company id must be a positive integer' });
  if (!(await Company.getById(id))) throw new HttpError(404, 'Not Found');
  return id;
}

export const GET = route(async (_request: NextRequest, ctx: Ctx) => json(await Company.parentChain(await companyId(ctx))));

// { parent: "Take-Two Interactive", wikiUrl? } makes that company its parent
// (created if new); { parent: null } clears it. Admin only, as the dev
// machine's `companies:parents` run sends them.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const id = await companyId(ctx);
  const body = await readJson<{ parent?: unknown; wikiUrl?: unknown }>(request);
  const name = typeof body.parent === 'string' ? body.parent.trim().slice(0, 200) : null;
  if (body.parent !== null && !name) throw new HttpError(400, '', { message: 'parent must be a company name or null' });
  const wikiUrl = typeof body.wikiUrl === 'string' && /^https:\/\/[a-z]+\.wikipedia\.org\//.test(body.wikiUrl) ? body.wikiUrl : null;
  const parent = await Company.setParent(id, name, wikiUrl);
  return json({ parent: parent ? { id: parent.id, name: parent.name } : null });
});
