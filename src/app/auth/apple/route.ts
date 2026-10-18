import type { NextRequest } from 'next/server';
import { startSignIn } from '@/server/oauth';

export function GET(request: NextRequest) {
  return startSignIn(request, 'apple');
}
