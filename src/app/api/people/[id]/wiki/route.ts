import type { NextRequest } from 'next/server';
import { OKF_VERSION } from '@/lib/okf';
import { collapseSparsePhases } from '@/lib/people';
import { requireRole } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Person from '@/server/model/person';
import PersonWiki from '@/server/model/personWiki';
import { PersonInputError, readPerson } from '@/server/personInput';
import { invalidatePeople } from '@/server/services/cache';

type Ctx = RouteContext<'/api/people/[id]/wiki'>;

// The wiki under a person's page: the OKF concept (type Person) their
// statements are compiled into, each citing a numbered source. `?path=page`
// returns it as markdown; otherwise { okf_version, files } as an OKF bundle.
// Public: it holds only what the page shows.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const id = intParam((await ctx.params).id);
  if (!(await Person.exists(id))) throw new HttpError(404, 'Not Found');
  if (!(await PersonWiki.page(id))) await PersonWiki.rebuild(id);
  const headers = { 'Cache-Control': 'public, max-age=300' };
  // ?path=radar: the person's life-phase radars as data - the generated
  // overview and any researched phases, each axis with its score and source.
  // As the page draws it: phases that are each too sparse to draw a shape are
  // one entry (`?phases=all` returns every researched phase as stored).
  if (request.nextUrl.searchParams.get('path') === 'radar') {
    const compiled = await PersonWiki.compiled(id);
    const phases = compiled?.phases ?? [];
    return json({ phases: request.nextUrl.searchParams.get('phases') === 'all' ? phases : collapseSparsePhases(phases) }, 200, headers);
  }
  if (request.nextUrl.searchParams.get('path') === 'page') {
    const page = await PersonWiki.page(id);
    if (!page) throw new HttpError(404, 'Not Found');
    return new Response(page, { headers: { 'Content-Type': 'text/markdown; charset=utf-8', ...headers } });
  }
  const files = await PersonWiki.bundle([id]);
  return json({ okf_version: OKF_VERSION, files: Object.fromEntries(files) }, 200, headers);
});

// Updates the wiki's data and compiles it again. The body may carry any of the
// profile's lists and fields (see PUT /api/people/:id); `phases` replaces the
// researched life phases - each axis needs a 0..5 score, a confidence and an
// https evidence URL, or it is dropped - and `educationLevel` with its source
// sets the degree. Whatever the body leaves out is kept. The generated
// overview is rebuilt from the documented data each time. Admin only.
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const id = intParam((await ctx.params).id);
  const current = await Person.profile(id);
  if (!current) throw new HttpError(404, 'Not Found');
  const body = await readJson<Record<string, unknown>>(request);
  let input;
  try {
    input = readPerson({ name: current.name, ...body });
  } catch (err) {
    if (err instanceof PersonInputError) throw new HttpError(400, '', { message: err.message });
    throw err;
  }
  await Person.save(input, id);
  invalidatePeople();
  const compiled = await PersonWiki.compiled(id);
  return json({ id, phases: compiled?.phases ?? [] });
});

// Compiles the wiki again - and with it regenerates the overview radar - from
// what is stored. Admin only.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  await requireRole('admin', request);
  const id = intParam((await ctx.params).id);
  if (!(await PersonWiki.rebuild(id))) throw new HttpError(404, 'Not Found');
  invalidatePeople();
  const compiled = await PersonWiki.compiled(id);
  return json({ id, phases: compiled?.phases ?? [] });
});
