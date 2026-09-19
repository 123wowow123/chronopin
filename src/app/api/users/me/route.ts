import _ from 'lodash';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { getUser, requireUser, signToken, tokenCookie } from '@/server/auth';
import { json, readJson, route } from '@/server/http';
import User, { patchableUserProps, pickUserProps, takenBody, takenField } from '@/server/model/user';
import { loadUser } from '@/server/services/users';

// The signed-in user's own account, or null when signed out. Every page load
// asks (src/lib/client/session.ts), so being signed out is not an error: a 401
// would log a failed request in every visitor's console.
export const GET = route(async (request: NextRequest) => {
  const user = await getUser(request);
  return json(user ? user.pick(pickUserProps) : null);
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
    const taken = takenField(err);
    if (taken) return json(takenBody(taken), 409);
    return json(err instanceof Error ? { message: err.message } : err, 422);
  }

  const token = await signToken(user.id, user.role);
  (await cookies()).set(tokenCookie(token));
  return json({ token });
});
