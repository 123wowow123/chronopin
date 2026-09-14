import _ from 'lodash';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { requireUser, signToken, tokenCookie } from '@/server/auth';
import { json, readJson, route } from '@/server/http';
import User, { patchableUserProps, pickUserProps } from '@/server/model/user';
import { loadUser } from '@/server/services/users';

// The signed-in user's own account.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  return json(user.pick(pickUserProps));
});

// Change handle, name or email. Only those: a patch that took every field
// would let anyone make themselves an admin.
export const PATCH = route(async (request: NextRequest) => {
  const signedIn = await requireUser(request);
  const patch = new User(_.pick(await readJson(request), patchableUserProps));
  const user = (await loadUser(signedIn.id)).patchSet(patch);

  try {
    await user.patchWithoutPassword();
  } catch (err) {
    return json(err instanceof Error ? { message: err.message } : err, 422);
  }

  const token = await signToken(user.id, user.role);
  (await cookies()).set(tokenCookie(token));
  return json({ token });
});
