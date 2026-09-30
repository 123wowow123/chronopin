import type { NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { requireVerifiedEmail } from '@/server/emailVerification';
import { json, paginationHeaders, paginationLink, readJson, route } from '@/server/http';
import { createPin } from '@/server/services/createPin';
import { getPins } from '@/server/services/timeline';
import { linkParams, resolveCreatedSince } from '@/server/util/createdFilter';

// A page of the timeline.
// GET /api/pins?from_date_time=[-]ISO&last_pin_id=N&hasFavorite=1&created_within=1d
export const GET = route(async (request: NextRequest) => {
  const query = request.nextUrl.searchParams;
  const user = await getUser(request);
  const createdSince = resolveCreatedSince({
    created_since: query.get('created_since'),
    created_within: query.get('created_within'),
  });

  const pins = await getPins({
    userId: user?.id ?? 0,
    fromDateTime: query.get('from_date_time'),
    lastPinId: Number(query.get('last_pin_id')) || 0,
    onlyFavorites: !!query.get('hasFavorite'),
    createdSince,
  });

  const link = paginationLink(request, pins, linkParams(createdSince));
  return json(pins, 200, paginationHeaders(link, pins.queryCount));
});

// Creates a pin authored by the signed-in user. Besides the pin's own fields
// the body may carry stocks: [{ symbol, name?, relation: company|related|
// supplier, note? }] (a scrape's, see GET /api/scrape), which are checked on
// Nasdaq and added once the pin is saved, and tags: ["Artemis", ...] (or one
// comma-separated string), the pin's own tags (src/lib/tags.ts), and
// categories: ["Anime", ...] (or the old category: "Anime"), its category
// tags from src/lib/categories.ts - a category among its tags is one. A body with
// no parentId at all is threaded like a scrape: a later anime season responds
// to its earlier season's pin (server/scrape/prequel.ts), and an AI model's
// release or update to its line's previous one (server/scrape/modelSeries.ts);
// parentId: null posts it on its own. A flightPath: { points: [[lat, lng], ...],
// label?, sourceUrl?, estimated? } is drawn from the pin's place on its page
// (src/server/services/pinFlightPath.ts). Either way, later seasons or versions
// that answered an earlier one move under this one when it now comes between.
// A company pin's sentiment (-1..1) and productLine, when sent, are its score for
// the company graph (authoredScore), so the save makes no scoring call.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  requireVerifiedEmail(user);
  return json(await createPin(await readJson(request), user), 201);
});
