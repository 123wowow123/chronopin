import type { NextRequest } from 'next/server';
import { getUser } from '@/server/auth';
import { json, route } from '@/server/http';
import Listing from '@/server/model/listing';
import { resolveCreatedSince } from '@/server/util/createdFilter';
import { parseSearchQuery } from '@/server/util/searchQuery';

// The listings on offer that say where they are: the map's Marketplace
// layer. The map's filters carry over from its pins: ?q= for its pin: terms
// (a pin's "Marketplace map" link sends pin:<id>, keeping to that pin's
// listings) and tag: terms (the rest of a query says nothing about a
// listing), and ?created_within= for when the listing was posted. ?pin=<id>
// is the older spelling of a pin: term.
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const viewer = await getUser(request);
  const { ids, tags, excludeTags } = parseSearchQuery(params.get('q'));
  const pinId = Number(params.get('pin'));
  const pinIds = Number.isInteger(pinId) && pinId > 0 && !ids.includes(pinId) ? [...ids, pinId] : ids;
  const createdSince = resolveCreatedSince({ created_since: params.get('created_since'), created_within: params.get('created_within') });
  return json({ listings: await Listing.onMap(viewer?.id ?? null, pinIds, { createdSince, tags, excludeTags }) });
});
