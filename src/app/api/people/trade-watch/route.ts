import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import PersonTrade from '@/server/model/personTrade';

// How many readers watch every person's trades, and whether the caller does.
export const GET = route(async (request: NextRequest) => {
  const viewer = await getUser(request);
  return json(await PersonTrade.statusAll(viewer?.id ?? null));
});

// Watching all stock trades: each new filing by anyone writes a 'trade'
// notification to the bell, people added later included.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { changed } = await PersonTrade.watchAll(user.id);
  return json(await PersonTrade.statusAll(user.id), changed ? 201 : 200);
});

export const DELETE = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  await PersonTrade.unwatchAll(user.id);
  return json(await PersonTrade.statusAll(user.id));
});
