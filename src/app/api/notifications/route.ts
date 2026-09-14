import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import Notification from '@/server/model/notification';

// The signed-in user's notifications, newest first. GET /api/notifications?limit=30
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const [notifications, unreadCount] = await Promise.all([
    Notification.list(user.id, request.nextUrl.searchParams.get('limit')),
    Notification.unreadCount(user.id),
  ]);
  return json({ notifications, unreadCount });
});
