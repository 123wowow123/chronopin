import type { NextRequest } from 'next/server';
import { HttpError, intParam, json, route } from '@/server/http';
import Person from '@/server/model/person';
import PersonTrade from '@/server/model/personTrade';

type Ctx = RouteContext<'/api/people/[id]/trades'>;

// The stock trades a person has disclosed, newest first.
// ?limit (1-200) and ?offset page through them, for the person page's "More" button;
// with neither, the newest 500.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  if (!(await Person.exists(id))) throw new HttpError(404, 'Not Found');
  const params = request.nextUrl.searchParams;
  const paged = params.has('limit') || params.has('offset');
  const limit = paged ? Math.min(200, Math.max(1, Number(params.get('limit')) || 100)) : 500;
  const offset = Math.max(0, Number(params.get('offset')) || 0);
  const [trades, total] = await Promise.all([PersonTrade.list(id, limit, offset), PersonTrade.count(id)]);
  return json({ personId: id, total, trades }, 200, { 'Cache-Control': 'public, max-age=300' });
});
