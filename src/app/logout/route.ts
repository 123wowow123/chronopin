import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { TOKEN_COOKIE } from '@/server/auth';
import { publicOrigin } from '@/server/http';
import { afterLoginPath } from '@/lib/authRedirect';

// Signs out and goes back where the user was (?referrer=/path, with its query),
// or home. Checked like a login redirect, which also turns away '/\\host'.
export async function GET(request: NextRequest) {
  (await cookies()).delete(TOKEN_COOKIE);
  const target = afterLoginPath(request.nextUrl.searchParams.get('referrer'));
  return Response.redirect(publicOrigin(request) + target, 302);
}
