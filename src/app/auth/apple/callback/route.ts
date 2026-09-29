import type { NextRequest } from 'next/server';
import { finishSignIn } from '@/server/oauth';

// Apple posts this callback back (response_mode=form_post), which asking for a
// name and an email requires. GET covers the errors it hands back before the
// user has authorised anything, which still arrive as a plain redirect.
export function POST(request: NextRequest) {
  return finishSignIn(request, 'apple');
}

export function GET(request: NextRequest) {
  return finishSignIn(request, 'apple');
}
