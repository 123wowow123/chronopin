import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import Notification from '@/server/model/notification';
import { timeZoneOrUtc } from '@/server/viewer';

// The signed-in user's notifications, newest first. GET /api/notifications?limit=30
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  // The viewer's own zone: it decides which day a batch of pins falls on.
  const timeZone = timeZoneOrUtc(request.cookies.get('tz')?.value);
  await Notification.notifyWatchedToday(user.id, timeZone);
  const [notifications, unreadCount] = await Promise.all([
    Notification.list(user.id, request.nextUrl.searchParams.get('limit'), timeZone),
    Notification.unreadCount(user.id, timeZone),
  ]);
  return json({ notifications, unreadCount });
});
