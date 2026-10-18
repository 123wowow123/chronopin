import type { NextRequest } from 'next/server';
import { json, readJson, route } from '@/server/http';
import User from '@/server/model/user';

// Whether a @handle is free.
export const POST = route(async (request: NextRequest) => {
  const { handle } = await readJson(request);
  const { user } = await User.getUserByUserName(String(handle));
  return json({ available: !user });
});
