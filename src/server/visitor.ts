// Who is counted for a view or an impression: "u:<userId>" when signed in,
// else "v:<id>" from an anonymous visitor cookie (set here on first use), so a
// guest reloading a page counts once a day.

import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { getUser } from './auth';

const VISITOR_COOKIE = 'vid';
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

export async function viewerKey(request: NextRequest): Promise<string> {
  const user = await getUser(request);
  if (user) {
    return `u:${user.id}`;
  }
  const jar = await cookies();
  let visitor = jar.get(VISITOR_COOKIE)?.value;
  if (!visitor || !/^[0-9a-f-]{36}$/.test(visitor)) {
    visitor = randomUUID();
    jar.set({
      name: VISITOR_COOKIE,
      value: visitor,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: VISITOR_MAX_AGE,
    });
  }
  return `v:${visitor}`;
}
