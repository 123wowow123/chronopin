import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import Notification from '@/server/model/notification';

// Just the badge number, for polling.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  return json({ unreadCount: await Notification.unreadCount(user.id) });
});
