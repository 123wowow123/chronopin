import _ from 'lodash';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { requireRole, signToken, tokenCookie } from '@/server/auth';
import { json, readJson, route } from '@/server/http';
import User, { pickUserProps, Users } from '@/server/model/user';

// Every user (admin only).
export const GET = route(async (request: NextRequest) => {
  await requireRole('admin', request);
  return json(await Users.getAll(pickUserProps));
});

// Sign up with email and password. Signs the new user in.
export const POST = route(async (request: NextRequest) => {
  // Only what the sign-up form asks for. The Express route took the whole
  // body, so a request could also set an id, social ids or a salt.
  const user = new User(_.pick(await readJson(request), ['userName', 'firstName', 'lastName', 'email', 'password']));
  user.provider = 'local';
  user.role = 'user';

  try {
    await user.save();
  } catch (err) {
    return json(err instanceof Error ? { message: err.message } : err, 422);
  }

  const token = await signToken(user.id, user.role);
  (await cookies()).set(tokenCookie(token));
  return json({ token });
});
