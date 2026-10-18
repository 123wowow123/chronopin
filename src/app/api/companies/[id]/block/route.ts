import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, noContent, route } from '@/server/http';
import Company from '@/server/model/company';
import CompanyBlock from '@/server/model/companyBlock';

type Ctx = RouteContext<'/api/companies/[id]/block'>;

// The company as a positive integer id that belongs to a real company.
async function companyId(ctx: Ctx): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, '', { message: 'company id must be a positive integer' });
  }
  if (!(await Company.getById(id))) {
    throw new HttpError(404, 'Not Found');
  }
  return id;
}

// Blocks a company for the signed-in reader (0078): its pins leave their
// timeline and search, and a follow of it ends.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const id = await companyId(ctx);
  const { changed } = await CompanyBlock.block(user.id, id);
  return json({ companyId: id, blocked: true }, changed ? 201 : 200);
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  await CompanyBlock.unblock(user.id, await companyId(ctx));
  return noContent();
});
