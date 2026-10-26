import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Person from '@/server/model/person';
import PersonHoldings, { holdingsEtag } from '@/server/model/personHoldings';
import { HoldingsInputError, readHoldings } from '@/server/holdingsInput';
import { invalidatePeople } from '@/server/services/cache';

type Ctx = { params: Promise<{ id: string }> };
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const profile = await Person.profile(intParam((await ctx.params).id));
  if (!profile) throw new HttpError(404, 'Not Found');
  const portfolios = await PersonHoldings.forPerson(profile.id, profile.name);
  return json({ portfolios }, 200, { ETag: holdingsEtag(portfolios), 'Cache-Control': 'no-cache' });
});

export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const profile = await Person.profile(intParam((await ctx.params).id));
  if (!profile) throw new HttpError(404, 'Not Found');
  const expected = request.headers.get('if-match');
  if (!expected) throw new HttpError(428, 'Read the current holdings and send its ETag in If-Match');
  let portfolios;
  try { portfolios = readHoldings(await readJson(request)); }
  catch (error) {
    if (error instanceof HoldingsInputError) throw new HttpError(400, '', { message: error.message });
    throw error;
  }
  if (!(await PersonHoldings.save(profile.id, profile.name, portfolios, expected))) throw new HttpError(412, 'Holdings changed; read and merge again');
  invalidatePeople();
  const saved = await PersonHoldings.forPerson(profile.id, profile.name);
  return json({ portfolios: saved }, 200, { ETag: holdingsEtag(saved) });
});
