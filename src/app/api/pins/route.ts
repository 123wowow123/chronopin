import { after, type NextRequest } from 'next/server';
import { getUser, requireUser } from '@/server/auth';
import { emitPinEvent } from '@/server/events';
import { HttpError, json, paginationHeaders, paginationLink, readJson, route } from '@/server/http';
import Pin from '@/server/model/pin';
import PinRating from '@/server/model/pinRating';
import PinReference from '@/server/model/pinReference';
import { delayProblem } from '@/lib/delay';
import { attributeReferences } from '@/lib/referenceAttribution';
import { parseScrapedStocks } from '@/lib/stocks';
import { parseTags } from '@/lib/tags';
import PinTag from '@/server/model/pinTag';
import { rejectDuplicateSourceUrl } from '@/server/services/duplicatePin';
import { invalidatePin } from '@/server/services/cache';
import { reslotSeries, seriesPinFor } from '@/server/scrape/modelSeries';
import { prequelPinFor, reslotSequels } from '@/server/scrape/prequel';
import { addPinStocksQuietly } from '@/server/services/pinStocks';
import { getPins } from '@/server/services/timeline';
import log from '@/server/util/log';
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
// comma-separated string), the pin's own tags (src/lib/tags.ts). A body with
// no parentId at all is threaded like a scrape: a later anime season responds
// to its earlier season's pin (server/scrape/prequel.ts), and an AI model's
// release or update to its line's previous one (server/scrape/modelSeries.ts);
// parentId: null posts it on its own. Either way, later seasons or versions
// that answered an earlier one move under this one when it now comes between.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const body = await readJson(request);
  const pin = new Pin(body);
  const stocks = parseScrapedStocks(body.stocks);
  const tags = parseTags(body.tags);
  pin.setUser(user);
  const problem = PinReference.problem(pin.references) ?? PinRating.problem(pin.ratings) ?? delayProblem(pin);
  if (problem) {
    throw new HttpError(400, problem);
  }
  await rejectDuplicateSourceUrl(pin);
  if (body.parentId === undefined) pin.parentId = ((await prequelPinFor(pin)) ?? (await seriesPinFor(pin)))?.id;
  // A new pin's references are all its author's.
  attributeReferences(pin.references, { existing: [], editorId: user.id, authorId: user.id });

  const { pin: saved } = await pin.save();
  if (tags?.length) await PinTag.setUserTags(saved.id, tags);
  emitPinEvent('save', saved, { userId: user.id });
  invalidatePin(saved.id);
  // A response joins its parent's thread.
  if (saved.parentId) invalidatePin(saved.parentId);
  await Promise.all([
    reslotSequels({ id: saved.id, sourceUrl: pin.sourceUrl, category: pin.category, ratings: pin.ratings }),
    reslotSeries({ id: saved.id, title: pin.title, company: pin.company }),
  ])
    .then((results) => results.flat())
    .then((moved) => moved.flatMap((m) => [m.id, m.from, m.to]).forEach((id) => id && invalidatePin(id)))
    .catch((err) => log.warn('re-slotting later seasons failed:', (err as Error).message));
  if (stocks.length) after(() => addPinStocksQuietly(saved.id, stocks));

  // Answered from the database, so the response is exactly what a reload shows.
  const { pin: stored } = await Pin.queryById(saved.id, user.id);
  return json(stored ?? saved, 201);
});
