import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import Notification from '@/server/model/notification';
import { timeZoneOrUtc } from '@/server/viewer';

// Just the badge number, for polling. Each poll first writes any 'today'
// notifications due, so a watched pin's arrives within a minute of midnight.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  await Notification.notifyWatchedToday(user.id, timeZoneOrUtc(request.cookies.get('tz')?.value));
  return json({ unreadCount: await Notification.unreadCount(user.id) });
});
