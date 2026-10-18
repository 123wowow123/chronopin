import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { json, route } from '@/server/http';
import PinNotInterested from '@/server/model/pinNotInterested';

// The ids of the pins the signed-in reader marked "Not interested" (0077).
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  return json(await PinNotInterested.pinIds(user.id));
});
