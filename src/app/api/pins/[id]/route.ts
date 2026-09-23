import { after, type NextRequest } from 'next/server';
import { getUser, isAdmin, requireUser } from '@/server/auth';
import { emitPinEvent } from '@/server/events';
import { HttpError, intParam, json, noContent, readJson, route } from '@/server/http';
import CompanyFollow from '@/server/model/companyFollow';
import Pin, { sameSourceUrlKey } from '@/server/model/pin';
import PinDuplicate from '@/server/model/pinDuplicate';
import PinReference from '@/server/model/pinReference';
import type User from '@/server/model/user';
import { invalidatePin } from '@/server/services/cache';
import { addPinStocksQuietly } from '@/server/services/pinStocks';
import { rejectDuplicateSourceUrl } from '@/server/services/duplicatePin';
import { delayProblem } from '@/lib/delay';
import { attributeReferences } from '@/lib/referenceAttribution';
import { parseScrapedStocks } from '@/lib/stocks';
import { bodyCategories } from '@/lib/categories';
import { parseTags } from '@/lib/tags';
import PinTag from '@/server/model/pinTag';
import { requestLocale } from '@/lib/i18n/request';
import { toJson, type PinJson } from '@/lib/types';
import { localizePins } from '@/server/services/translations';
import log from '@/server/util/log';
import { citePostedSummary } from '@/server/extract/references';

type Ctx = RouteContext<'/api/pins/[id]'>;

export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await getUser(request);
  const { pin } = await Pin.queryById(pinId, user?.id);
  if (!pin) {
    throw new HttpError(404, 'Not Found');
  }
  // English (the pin as stored) unless the page asks for its language.
  const [body] = await localizePins([toJson<PinJson>(pin)], requestLocale(request, { cookie: false }));
  return json(body);
});

// A pin is editable by the person who posted it and by an admin. Signing in
// alone is not enough, or any account could rewrite anyone's pins.
async function loadModifiable(request: NextRequest, ctx: Ctx): Promise<{ user: User; existing: Pin }> {
  const pinId = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const { pin: existing } = await Pin.queryById(pinId);
  if (!existing) {
    throw new HttpError(404, 'Not Found');
  }
  if (!isAdmin(user) && Number(existing.userId) !== Number(user.id)) {
    throw new HttpError(403, 'Forbidden');
  }
  return { user, existing };
}

const update = route(async (request: NextRequest, ctx: Ctx) => {
  const { user, existing } = await loadModifiable(request, ctx);

  const body = await readJson(request);
  const pin = new Pin(body);
  // Tickers in the body are added, never replace the pin's (pin page edits
  // them); leaving them out changes nothing.
  const stocks = parseScrapedStocks(body.stocks);
  // Tags, when sent, are the pin's whole list (the form sends them all);
  // left out, the pin keeps the ones it has.
  const tags = parseTags(body.tags);
  pin.categories = bodyCategories(body, tags);
  // Citations written [S] and [n] become links to the source and references.
  pin.longFormSummary = citePostedSummary(pin.longFormSummary, pin.sourceUrl, pin.references) ?? pin.longFormSummary;
  const referenceProblem = PinReference.problem(pin.references) ?? delayProblem(pin);
  if (referenceProblem) {
    throw new HttpError(400, referenceProblem);
  }
  pin.id = existing.id;
  // Keep whoever posted it as the author; an edit is not a transfer of
  // ownership, and an update writes userId on every save.
  pin.userId = existing.userId;
  // References are re-saved wholesale: the ones the pin had keep their
  // contributor, and any new one an admin adds to someone else's pin is theirs.
  attributeReferences(pin.references, { existing: existing.references, editorId: user.id, authorId: existing.userId });
  // Only a changed URL is checked, so pins that already share one stay editable.
  if (sameSourceUrlKey(pin.sourceUrl) !== sameSourceUrlKey(existing.sourceUrl)) {
    await rejectDuplicateSourceUrl(pin);
  }

  const { pin: updated } = await pin.update();
  if (tags) await PinTag.setUserTags(updated.id, tags);
  emitPinEvent('update', updated, { userId: user.id });
  // A pin that has just been given a company is news to that company's
  // followers, as a new pin for it would be. Editing it again tells nobody
  // twice: a follower gets one notification per pin and company.
  if (updated.companyId && updated.companyId !== existing.companyId) {
    after(() =>
      CompanyFollow.notifyNewPin({ pinId: updated.id, companyId: updated.companyId, authorId: updated.userId ?? user.id }).catch((err) =>
        log.warn('telling company followers failed:', (err as Error).message),
      ),
    );
  }
  invalidatePin(updated.id);
  // A response moved between threads leaves one and joins the other.
  for (const parentId of new Set([existing.parentId, updated.parentId])) if (parentId) invalidatePin(parentId);
  if (stocks.length) after(() => addPinStocksQuietly(updated.id, stocks));

  const { pin: stored } = await Pin.queryById(updated.id, user.id);
  return json(stored ?? updated);
});

export const PUT = update;
export const PATCH = update;

// A soft delete.
export const DELETE = route(async (request: NextRequest, ctx: Ctx) => {
  const { user, existing } = await loadModifiable(request, ctx);
  // Its duplicates' pages list it, so they refresh too.
  const group = await PinDuplicate.group(existing.id);
  await existing.delete();
  emitPinEvent('remove', existing, { userId: user.id });
  for (const id of group) {
    invalidatePin(id);
  }
  return noContent();
});
