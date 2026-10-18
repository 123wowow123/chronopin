import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { signToken, tokenCookie } from '@/server/auth';
import { json, readJson, route } from '@/server/http';
import User from '@/server/model/user';

// Email and password sign-in. Sets the session cookie and also answers with
// the token, for API clients. `code` names the failure so the login form can
// say it in the page's language; `message` stays English for API clients.
export const POST = route(async (request: NextRequest) => {
  const { email, password } = await readJson(request);
  const { user } = await User.getByEmail(String(email || '').toLowerCase());
  if (!user) {
    return json({ code: 'emailNotRegistered', message: 'This email is not registered.' }, 401);
  }
  if (!(await user.authenticate(String(password || '')))) {
    return json({ code: 'wrongPassword', message: 'This password is not correct.' }, 401);
  }
  const token = await signToken(user.id, user.role);
  (await cookies()).set(tokenCookie(token));
  return json({ token });
});
