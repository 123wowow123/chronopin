import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { noContent, route } from '@/server/http';
import Notification from '@/server/model/notification';

// Marks everything read (opening the bell).
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  await Notification.markAllRead(user.id);
  return noContent();
});
