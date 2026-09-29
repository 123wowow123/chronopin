import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import { onlineUsers } from '@/server/liveFeed';
import Message from '@/server/model/message';

// The signed-in user's chats, the latest first, with whether each other
// side has a page open now. GET /api/messages?limit=50
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const limit = Number(request.nextUrl.searchParams.get('limit')) || 50;
  const [conversations, unreadCount] = await Promise.all([Message.conversations(user.id, limit), Message.unreadCount(user.id)]);
  const online = onlineUsers(conversations.map((c) => c.other.id));
  return json({ conversations: conversations.map((c) => ({ ...c, online: online.has(c.other.id) })), unreadCount });
});
