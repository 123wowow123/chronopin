import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { HttpError, intParam, json, route } from '@/server/http';
import Person from '@/server/model/person';
import PersonTrade from '@/server/model/personTrade';

type Ctx = RouteContext<'/api/people/[id]/trade-watch'>;

async function personId(ctx: Ctx): Promise<number> {
  const id = intParam((await ctx.params).id);
  if (!(await Person.exists(id))) throw new HttpError(404, 'Not Found');
  return id;
}

async function status(id: number, viewerId: number | null, code = 200) {
  return json({ personId: id, ...(await PersonTrade.status(id, viewerId)) }, code);
}

// How many people watch this person's trades, and whether the caller does.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await getUser(request);
  return status(await personId(ctx), viewer?.id ?? null);
});

// Watching a person's trades: each new filing writes a 'trade' notification
// to the bell (and a browser notification where the caller allowed them).
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const id = await personId(ctx);
  const { changed } = await PersonTrade.watch(user.id, id);
  return status(id, user.id, changed ? 201 : 200);
});

export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const user = await requireUser(request);
  const id = await personId(ctx);
  await PersonTrade.unwatch(user.id, id);
  return status(id, user.id);
});
