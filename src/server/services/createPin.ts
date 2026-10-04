import { after } from 'next/server';
import { emitPinEvent } from '@/server/events';
import { refreshGameInfo } from './gameInfo';
import { HttpError } from '@/server/http';
import CompanyFollow from '@/server/model/companyFollow';
import Follow from '@/server/model/follow';
import Pin from '@/server/model/pin';
import PinRating from '@/server/model/pinRating';
import PinReference from '@/server/model/pinReference';
import { delayProblem } from '@/lib/delay';
import { attributeReferences } from '@/lib/referenceAttribution';
import { parseScrapedStocks } from '@/lib/stocks';
import { bodyCategories } from '@/lib/categories';
import { parseTags } from '@/lib/tags';
import PinTag from '@/server/model/pinTag';
import { rejectDuplicateSourceUrl } from '@/server/services/duplicatePin';
import { invalidatePin } from '@/server/services/cache';
import { welcomeToThread } from '@/server/services/watchAlerts';
import { reslotSeries, seriesPinFor } from '@/server/scrape/modelSeries';
import { prequelPinFor, reslotSequels } from '@/server/scrape/prequel';
import { flightPathProblem, saveFlightPath } from '@/server/services/pinFlightPath';
import { addPinStocksQuietly } from '@/server/services/pinStocks';
import log from '@/server/util/log';
import { citePostedSummary } from '@/server/extract/references';
import { authoredScore } from '@/server/extract/pinSentiment';
import PinSentiment from '@/server/model/pinSentiment';
import type User from '@/server/model/user';

// Creates a pin authored by user (POST /api/pins: the signed-in user; POST
// /api/admin/pins: a user the admin posts for). Besides the pin's own fields
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
export async function createPin(body: Record<string, any>, user: User, { noBrowser = false } = {}) {
  const pin = new Pin(body);
  const stocks = parseScrapedStocks(body.stocks);
  const tags = parseTags(body.tags);
  const score = authoredScore(body);
  pin.categories = bodyCategories(body, tags);
  // Citations written [S] and [n] become links to the source and references.
  pin.longFormSummary = citePostedSummary(pin.longFormSummary, pin.sourceUrl, pin.references) ?? pin.longFormSummary;
  pin.setUser(user);
  const problem =
    (typeof score === 'string' ? score : undefined) ??
    PinReference.problem(pin.references) ??
    PinRating.problem(pin.ratings) ??
    delayProblem(pin) ??
    (body.flightPath ? flightPathProblem(body.flightPath) : undefined);
  if (problem) {
    throw new HttpError(400, problem);
  }
  await rejectDuplicateSourceUrl(pin);
  if (body.parentId === undefined) pin.parentId = ((await prequelPinFor(pin)) ?? (await seriesPinFor(pin)))?.id;
  // A new pin's references are all its author's.
  attributeReferences(pin.references, { existing: [], editorId: user.id, authorId: user.id });

  const { pin: saved } = await pin.save();
  if (tags?.length) await PinTag.setUserTags(saved.id, tags);
  if (body.flightPath) await saveFlightPath(saved.id, body.flightPath);
  if (score && typeof score !== 'string') await PinSentiment.setAuthored(saved.id, score);
  emitPinEvent('save', saved, { userId: user.id, noBrowser });
  // Everyone following the pin's company hears about it, and so does everyone
  // following its author. Told after the response, like the stock lookup below.
  after(() =>
    CompanyFollow.notifyNewPin({ pinId: saved.id, companyId: saved.companyId, authorId: user.id }).catch((err) =>
      log.warn('telling company followers failed:', (err as Error).message),
    ),
  );
  after(() =>
    Follow.notifyNewPin({ pinId: saved.id, authorId: user.id }).catch((err) =>
      log.warn('telling followers failed:', (err as Error).message),
    ),
  );
  invalidatePin(saved.id);
  // A response joins its parent's thread, and whoever watches that thread.
  if (saved.parentId) {
    invalidatePin(saved.parentId);
    after(() => welcomeToThread(saved.id, user.id));
  }
  await Promise.all([
    reslotSequels({ id: saved.id, sourceUrl: pin.sourceUrl, categories: pin.categories, ratings: pin.ratings }),
    reslotSeries({ id: saved.id, title: pin.title, company: pin.company }),
  ])
    .then((results) => results.flat())
    .then((moved) => {
      moved.flatMap((m) => [m.id, m.from, m.to]).forEach((id) => id && invalidatePin(id));
      // Later seasons moved under a pin with no parent of its own: it now heads
      // their thread, so that thread's watchers hear about it too.
      if (moved.length && !saved.parentId) after(() => welcomeToThread(saved.id, user.id));
    })
    .catch((err) => log.warn('re-slotting later seasons failed:', (err as Error).message));
  if (stocks.length) after(() => addPinStocksQuietly(saved.id, stocks));
  // A game's maturity rating, platforms and scores, from its Steam page.
  after(() => refreshGameInfo(saved.id).catch((err) => log.warn('game info lookup failed:', (err as Error).message)));

  // Answered from the database, so the response is exactly what a reload shows.
  const { pin: stored } = await Pin.queryById(saved.id, user.id);
  return stored ?? saved;
}
