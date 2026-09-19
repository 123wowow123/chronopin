import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import PinTag from '@/server/model/pinTag';
import { SearchPins } from '@/server/model/searchPin';

// What the navbar search suggests as you type: pins whose title or
// description starts with the text, and the categories and tags with a word
// starting with it.
export const GET = route(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) return json({ pins: [], queryCount: 0, categories: [], tags: [] });
  const [pins, categories, tags] = await Promise.all([SearchPins.querySearchPin(q, q), SearchPins.querySuggestCategories(q), PinTag.suggest(q, 5)]);
  return json({ ...pins, categories, tags });
});
