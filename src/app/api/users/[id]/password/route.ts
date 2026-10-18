import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, noContent, readJson, route } from '@/server/http';
import { loadUser } from '@/server/services/users';

// Change the signed-in user's password. The :id in the path is ignored; it is
// always the caller's own account.
export const PUT = route(async (request: NextRequest) => {
  const signedIn = await requireUser(request);
  const body = await readJson(request);
  const user = await loadUser(signedIn.id);

  if (!(await user.authenticate(String(body.oldPassword)))) {
    throw new HttpError(403, 'Forbidden');
  }
  user.password = String(body.newPassword);
  try {
    await user.update();
  } catch (err) {
    return json(err instanceof Error ? { message: err.message } : err, 422);
  }
  return noContent();
});
