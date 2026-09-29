import type { NextRequest } from 'next/server';
import { readVerifyToken } from '@/server/emailVerification';
import { publicOrigin, route } from '@/server/http';
import User from '@/server/model/user';

// The link in the confirmation email. It works signed out, or signed in as
// someone else: the token alone says whose address it confirms. Lands on the
// page that says how it went (the proxy adds the language).
export const GET = route(async (request: NextRequest) => {
  const origin = publicOrigin(request);
  const read = await readVerifyToken(request.nextUrl.searchParams.get('token') ?? '');
  let status: string = typeof read === 'string' ? read : 'invalid';
  if (typeof read === 'object') {
    const { user } = await User.getById(read.id);
    // A link to an address the account has since changed away from is stale.
    status = user && (await user.markEmailVerified(read.email)) ? 'ok' : 'invalid';
  }
  return Response.redirect(`${origin}/verify-email?status=${status}`, 302);
});
