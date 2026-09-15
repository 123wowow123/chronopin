import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { TOKEN_COOKIE } from '@/server/auth';
import { publicOrigin } from '@/server/http';

// Signs out and goes back where the user was (?referrer=/path), or home.
export async function GET(request: NextRequest) {
  (await cookies()).delete(TOKEN_COOKIE);
  const referrer = request.nextUrl.searchParams.get('referrer');
  const target = referrer && referrer.startsWith('/') && !referrer.startsWith('//') ? referrer : '/';
  return Response.redirect(publicOrigin(request) + target, 302);
}
