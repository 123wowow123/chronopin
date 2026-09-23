import type { NextRequest } from 'next/server';
import { json, route } from '@/server/http';
import Company from '@/server/model/company';
import PinTag from '@/server/model/pinTag';
import { SearchPins } from '@/server/model/searchPin';
import { reservedSuggestions, type TagCount } from '@/lib/tags';

// What the navbar search suggests as you type: pins whose title or
// description starts with the text, and the companies and tags (categories
// among them, kind 'category') with a word starting with it.
//
// The site's own filters (RESERVED_TAGS) are offered among the tags: they
// read as tags, and someone typing "estimated" or "thread" is after those
// pins whether or not the site keeps the word as a tag. They are matched
// here rather than in the database - a date's confidence is a column and a
// pin's score is read off its references, neither of them a row in
// "PinTagView" - and carry no count: the row shows the term it writes.
export const GET = route(async (request: NextRequest) => {
  const q = request.nextUrl.searchParams.get('q') || '';
  if (!q.trim()) return json({ pins: [], queryCount: 0, tags: [], companies: [] });
  const [pins, tags, companies] = await Promise.all([SearchPins.querySearchPin(q, q), PinTag.suggest(q, 6), Company.suggest(q, 4)]);
  const reserved: TagCount[] = reservedSuggestions(q).map((filter) => ({ name: filter.name, kind: 'reserved', count: 0 }));
  return json({ ...pins, tags: [...reserved, ...tags], companies });
});
