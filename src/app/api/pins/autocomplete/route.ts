import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import { SearchPins } from '@/server/model/searchPin';

// Pins whose title or description starts with the typed text.
export const GET = route(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get('q') || '';
  return json(await SearchPins.querySearchPin(q, q));
});
