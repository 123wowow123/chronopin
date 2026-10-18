import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { intParam, noContent, route } from '@/server/http';
import Message from '@/server/model/message';

type Ctx = RouteContext<'/api/messages/[userId]/read'>;

// The viewer has seen their chat with this user, up to its newest message.
export const POST = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await requireUser(request);
  await Message.markRead(viewer.id, intParam((await ctx.params).userId));
  return noContent();
});
