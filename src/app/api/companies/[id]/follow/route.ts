import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import Company from '@/server/model/company';
import CompanyFollow from '@/server/model/companyFollow';

type Ctx = RouteContext<'/api/companies/[id]/follow'>;

// The company as a positive integer id that belongs to a real company.
async function companyId(ctx: Ctx): Promise<number> {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, '', { message: 'company id must be a positive integer' });
  }
  const company = await Company.getById(id);
  if (!company) {
    throw new HttpError(404, 'Not Found');
  }
  return id;
}

// Every answer is the company's status as the caller now sees it, so the
// client can redraw the button and its count from one response.
async function status(id: number, viewerId: number | null, statusCode = 200) {
  return json({ companyId: id, ...(await CompanyFollow.status(id, viewerId)) }, statusCode);
}

// How many people follow this company, and whether the caller does.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await getUser(request);
  return status(await companyId(ctx), viewer?.id ?? null);
});

// Following a company means being told about its new pins: every pin saved
// for it writes a 'company' notification to the follower's bell.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const id = await companyId(ctx);
  const { changed } = await CompanyFollow.follow(user.id, id);
  return status(id, user.id, changed ? 201 : 200);
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const id = await companyId(ctx);
  await CompanyFollow.unfollow(user.id, id);
  return status(id, user.id);
});
