import type { NextRequest } from 'next/server';
import { requireRole } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { createUsersAs } from '@/server/services/adminUsers';

// Accounts made by an admin - a new curator desk, a tester - that can log in
// and post at once (services/adminUsers.ts).
//
//   POST { users: [{ userName, firstName, lastName, email, password?, role?,
//          emailVerified?, birthday?, phone? }, ...] }  or one user object
//        password: made up when left out, and returned once in the result;
//        role: user (default) or admin; emailVerified: true by default.
//        A user that fails (a taken email or handle, a missing name) is
//        reported and the rest are still made:
//        { results: [{ index, id, userName, email, role, emailVerified, password? }
//                    | { index, error, code? }] }
//        with 201 when every user was made, else 207.
export const POST = route(async (request: NextRequest) => {
  const admin = await requireRole('admin', request);
  const body = await readJson<{ users?: unknown[] } | Record<string, unknown>>(request);
  const users = Array.isArray((body as { users?: unknown[] }).users) ? (body as { users: unknown[] }).users : [body];
  if (!users.length) throw new HttpError(400, '', { message: 'Expected { users: [...] } or a user' });
  const results = await createUsersAs(admin, users);
  return json({ results }, results.every((r) => 'id' in r) ? 201 : 207);
});
