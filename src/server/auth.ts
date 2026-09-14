// Who is making a request. The session is a JWT (HS256, { id, role }) in the
// `token` cookie - the same token the Express app issued, so people stay
// signed in across the switch. An Authorization: Bearer header or an
// ?access_token= query parameter also works, for scripts and API testing.

import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import config from './config';
import User from './model/user';
import { HttpError } from './util/httpError';

export const TOKEN_COOKIE = 'token';
const TOKEN_TTL_SECONDS = 60 * 60 * 5;

const secret = new TextEncoder().encode(config.secrets.session);

export async function signToken(id: number, role?: string): Promise<string> {
  const payload: Record<string, unknown> = { id };
  if (role) {
    payload.role = role;
  }
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(secret);
}

// The cookie options for a session token. httpOnly: the browser code never
// needs to read it now that pages render on the server.
export function tokenCookie(token: string) {
  return {
    name: TOKEN_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TOKEN_TTL_SECONDS,
  };
}

async function tokenFrom(request?: Request): Promise<string | undefined> {
  if (request) {
    const url = new URL(request.url);
    const accessToken = url.searchParams.get('access_token');
    if (accessToken) {
      return accessToken;
    }
    const authorization = request.headers.get('authorization');
    if (authorization?.startsWith('Bearer ') && authorization.length > 'Bearer '.length) {
      return authorization.slice('Bearer '.length);
    }
  }
  return (await cookies()).get(TOKEN_COOKIE)?.value;
}

async function verify(token: string): Promise<{ id: number } | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
    const id = Number(payload.id);
    return Number.isInteger(id) ? { id } : null;
  } catch {
    return null;
  }
}

// The signed-in user, or null. A token that fails to verify counts as
// signed out rather than an error, so an expired cookie never breaks a page.
export async function getUser(request?: Request): Promise<User | null> {
  const token = await tokenFrom(request);
  if (!token) {
    return null;
  }
  const claims = await verify(token);
  if (!claims) {
    return null;
  }
  const { user } = await User.getById(claims.id);
  return user ?? null;
}

// The signed-in user, or a 401.
export async function requireUser(request?: Request): Promise<User> {
  const user = await getUser(request);
  if (!user) {
    throw new HttpError(401, 'Unauthorized');
  }
  return user;
}

// The signed-in user when their role is at least roleRequired, else 401/403.
export async function requireRole(roleRequired: string, request?: Request): Promise<User> {
  const user = await requireUser(request);
  if (config.userRoles.indexOf(user.role as never) < config.userRoles.indexOf(roleRequired as never)) {
    throw new HttpError(403, 'Forbidden');
  }
  return user;
}

export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === 'admin';
}
