import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Person from '@/server/model/person';
import { PersonInputError, readPerson } from '@/server/personInput';
import { invalidatePeople } from '@/server/services/cache';

type Ctx = RouteContext<'/api/people/[id]'>;

// One person's profile with their earnings, contributions, property and trips.
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const profile = await Person.profile(intParam((await ctx.params).id));
  if (!profile) throw new HttpError(404, 'Not Found');
  return json(profile, 200, { 'Cache-Control': 'public, max-age=300' });
});

// Replaces what the body names: the fields it gives, and each list it
// carries. A field left out keeps what is stored. Admin only.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const id = intParam((await ctx.params).id);
  if (!(await Person.exists(id))) throw new HttpError(404, 'Not Found');
  const body = await readJson<Record<string, unknown>>(request);
  let input;
  try {
    // The row is the URL's: a body that leaves the name out still reads.
    const current = await Person.profile(id);
    input = readPerson({ name: current!.name, ...body });
  } catch (err) {
    if (err instanceof PersonInputError) throw new HttpError(400, '', { message: err.message });
    throw err;
  }
  const saved = await Person.save(input, id);
  invalidatePeople();
  return json({ id: saved });
});
