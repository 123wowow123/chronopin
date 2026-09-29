import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import UserBlock from '@/server/model/userBlock';

// Whom the signed-in user has blocked, most recent first (Profile > Blocked,
// and what the timeline and search leave out). Never who blocked them.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  return json(await UserBlock.list(user.id));
});
