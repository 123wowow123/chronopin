import type { NextRequest } from 'next/server';
import { HttpError, intParam, json, route } from '@/server/http';
import Person from '@/server/model/person';
import PersonTrade from '@/server/model/personTrade';

type Ctx = RouteContext<'/api/people/[id]/trades'>;

// The stock trades a person has disclosed, newest first.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  if (!(await Person.exists(id))) throw new HttpError(404, 'Not Found');
  return json({ personId: id, trades: await PersonTrade.list(id) }, 200, { 'Cache-Control': 'public, max-age=300' });
});
