import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import PinTag from '@/server/model/pinTag';
import { SearchPins } from '@/server/model/searchPin';

// What the navbar search suggests as you type: pins whose title or
// description starts with the text, and the tags (categories among them,
// kind 'category') with a word starting with it.
export const GET = route(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) return json({ pins: [], queryCount: 0, tags: [] });
  const [pins, tags] = await Promise.all([SearchPins.querySearchPin(q, q), PinTag.suggest(q, 6)]);
  return json({ ...pins, tags });
});
