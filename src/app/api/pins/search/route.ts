import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, route } from '@/server/http';
import { searchPins } from '@/server/services/search';

// GET /api/pins/search?q=iphone company:Apple&f=watch
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const user = await getUser(request);
  const pins = await searchPins(params.get('q') || '', {
    userId: user?.id,
    onlyWatched: params.get('f')?.toLowerCase() === 'watch',
  });
  return json(pins);
});
