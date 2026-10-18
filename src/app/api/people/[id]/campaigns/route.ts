import type { NextRequest } from 'next/server';
import { HttpError, intParam, json, route } from '@/server/http';
import Person from '@/server/model/person';
import PersonCampaign from '@/server/model/personCampaign';

type Ctx = RouteContext<'/api/people/[id]/campaigns'>;

// A person's campaign finance by election cycle: totals, the other candidates
// in the race and the PACs that gave most (FEC bulk data).
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  if (!(await Person.exists(id))) throw new HttpError(404, 'Not Found');
  return json({ personId: id, cycles: await PersonCampaign.forPerson(id) }, 200, { 'Cache-Control': 'public, max-age=300' });
});
