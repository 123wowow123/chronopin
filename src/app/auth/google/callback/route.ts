import type { NextRequest } from 'next/server';
import { finishSignIn } from '@/server/oauth';

export function GET(request: NextRequest) {
  return finishSignIn(request, 'google');
}
