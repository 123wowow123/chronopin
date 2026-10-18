import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, intParam, json, route } from '@/server/http';
import Message from '@/server/model/message';

type Ctx = RouteContext<'/api/messages/[userId]/[messageId]'>;

// Unsends one of the viewer's own messages in their chat with this user.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const viewer = await requireUser(request);
  const { userId, messageId } = await ctx.params;
  const message = await Message.unsend(viewer.id, intParam(userId), intParam(messageId));
  if (!message) throw new HttpError(404, 'Not Found');
  return json({ message });
});
