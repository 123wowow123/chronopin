import { after, type NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { emitPinEvent } from '@/server/events';
import { HttpError, json, paginationHeaders, paginationLink, readJson, route } from '@/server/http';
import Pin from '@/server/model/pin';
import PinRating from '@/server/model/pinRating';
import PinReference from '@/server/model/pinReference';
import { attributeReferences } from '@/lib/referenceAttribution';
import { parseScrapedStocks } from '@/lib/stocks';
import { rejectDuplicateSourceUrl } from '@/server/services/duplicatePin';
import { invalidatePin } from '@/server/services/cache';
import { addPinStocksQuietly } from '@/server/services/pinStocks';
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
// Nasdaq and added once the pin is saved.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  const pin = new Pin(body);
  const stocks = parseScrapedStocks(body.stocks);
  pin.setUser(user);
  const problem = PinReference.problem(pin.references) ?? PinRating.problem(pin.ratings);
  if (problem) {
    throw new HttpError(400, problem);
  }
  await rejectDuplicateSourceUrl(pin);
  // A new pin's references are all its author's.
  attributeReferences(pin.references, { existing: [], editorId: user.id, authorId: user.id });

  const { pin: saved } = await pin.save();
  emitPinEvent('save', saved, { userId: user.id });
  invalidatePin(saved.id);
  if (stocks.length) after(() => addPinStocksQuietly(saved.id, stocks));

  // Answered from the database, so the response is exactly what a reload shows.
  const { pin: stored } = await Pin.queryById(saved.id, user.id);
  return json(stored ?? saved, 201);
});
