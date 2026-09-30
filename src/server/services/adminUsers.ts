// Accounts an admin makes for other people - a new curator desk, a tester -
// that can log in at once: the password is hashed as a sign-up's is, and the
// email is already confirmed unless the body says otherwise, so a desk can
// post without its email being confirmed by SQL. Used by POST
// /api/admin/users and POST /api/admin/db/User.

import { randomBytes } from 'node:crypto';
import { birthdayMessage, birthdayProblem } from '@/lib/birthday';
import { normalizePhone, phoneMessage, phoneProblem } from '@/lib/phone';
import { recordAudit } from '../adminDb';
import User, { takenBody, takenField } from '../model/user';
import { HttpError } from '../util/httpError';

export const MAX_ADMIN_USERS = 50;
export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type NewUserFields = {
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  birthday?: string;
  phone: string | null;
};
export type NewUser = { fields: NewUserFields; password: string; generated: boolean; emailVerified: boolean };

// A made-up password is returned once, in the create's result, and never again.
export type AdminUserResult =
  | { index: number; id: number; userName: string; email: string; role: UserRole; emailVerified: boolean; password?: string }
  | { index: number; error: string; code?: string };

const REQUIRED = ['userName', 'firstName', 'lastName', 'email'] as const;

// 20 characters from [A-Za-z0-9_-], 120 bits.
export function generatedPassword(): string {
  return randomBytes(15).toString('base64url');
}

const bad = (message: string) => new HttpError(400, '', { message });

// What a create body asks for, checked: the four names sign-up requires, an
// optional password (else one is made up), role (default user), the birthday
// and phone sign-up takes, and emailVerified (default true). Anything else in
// the body - an id, a salt, social ids - is ignored.
export function newUserFields(raw: unknown): NewUser {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw bad('Expected a user object');
  const body = raw as Record<string, unknown>;
  const text: Partial<Record<(typeof REQUIRED)[number], string>> = {};
  for (const key of REQUIRED) {
    const value = body[key];
    if (typeof value !== 'string' || !value.trim()) throw bad(`${key} is required`);
    text[key] = value.trim();
  }

  const role = body.role ?? 'user';
  if (!USER_ROLES.includes(role as UserRole)) throw bad(`role must be one of ${USER_ROLES.join(', ')}`);

  if (body.password != null && (typeof body.password !== 'string' || !body.password.length)) throw bad('password must be a non-empty string');
  const generated = body.password == null;
  const password = generated ? generatedPassword() : (body.password as string);

  if (body.emailVerified != null && typeof body.emailVerified !== 'boolean') throw bad('emailVerified must be true or false');

  const badBirthday = birthdayProblem(body.birthday);
  if (badBirthday) throw bad(birthdayMessage(badBirthday));
  if (phoneProblem(body.phone)) throw bad(phoneMessage());

  const fields: NewUserFields = { ...(text as Record<(typeof REQUIRED)[number], string>), role: role as UserRole, phone: normalizePhone(body.phone) };
  if (typeof body.birthday === 'string' && body.birthday) fields.birthday = body.birthday;
  return { fields, password, generated, emailVerified: body.emailVerified !== false };
}

// Creates each account in order and reports each one; one that fails (a taken
// email or handle, a missing name) does not stop the rest. Each is audited
// under the admin, without its password.
export async function createUsersAs(admin: User, bodies: unknown[]): Promise<AdminUserResult[]> {
  if (!bodies.length) throw bad('Expected at least one user');
  if (bodies.length > MAX_ADMIN_USERS) throw bad(`At most ${MAX_ADMIN_USERS} users per request`);
  const results: AdminUserResult[] = [];
  for (const [index, raw] of bodies.entries()) {
    try {
      const { fields, password, generated, emailVerified } = newUserFields(raw);
      const user = new User({ ...fields, password });
      user.provider = 'local';
      user.role = fields.role;
      user.emailVerifiedDateTime = emailVerified ? new Date() : null;
      await user.save();
      const summary = { id: user.id, userName: user.userName, email: user.email, role: fields.role, emailVerified };
      await recordAudit(admin.id, 'User', [{ action: 'insert', key: { id: user.id }, before: null, after: summary }]);
      results.push({ index, ...summary, ...(generated ? { password } : {}) });
    } catch (err) {
      const taken = takenField(err);
      if (taken) {
        results.push({ index, error: takenBody(taken).message, code: takenBody(taken).code });
        continue;
      }
      const message =
        err instanceof HttpError ? ((err.body as { message?: string } | undefined)?.message ?? err.message) : (err as Error).message;
      results.push({ index, error: message || 'Failed' });
    }
  }
  return results;
}
