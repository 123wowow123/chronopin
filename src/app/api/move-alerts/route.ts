import type { NextRequest } from 'next/server';
import { requireUser } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import { MAX_MOVE_ALERTS, MAX_THRESHOLD, MIN_THRESHOLD, STOCK_BASELINE_KEY } from '@/lib/moveAlerts';
import { normalizeSymbol } from '@/lib/stocks';
import MoveAlert from '@/server/model/moveAlert';
import PinTicker from '@/server/model/pinTicker';
import PremiumSubscription from '@/server/model/premiumSubscription';
import { currentValues, marketOnPin } from '@/server/services/moveAlerts';

// Premium price and odds alerts (0236).
//
// GET  /api/move-alerts[?pinId=]   { premium, alerts } - the reader's own, for a pin or all
// POST { kind: 'market', pinId, market, threshold }   a market the pin links to (its key, marketRefKey)
//      { kind: 'stock', pinId, symbol, threshold }    a ticker on the pin
//      Sets the alert, or changes its size; either way it is measured from the value read now.
//      Markets move in percentage points of chance, stocks in percent of price.
// DELETE /api/move-alerts/:id      turns one off
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const pinParam = request.nextUrl.searchParams.get('pinId');
  const pinId = pinParam ? parseInt(pinParam, 10) : null;
  const [premium, alerts] = await Promise.all([PremiumSubscription.hasAccess(user), MoveAlert.list(user.id, Number.isInteger(pinId) ? pinId : null)]);
  return json({ premium, alerts });
});

// A reader may have MAX_MOVE_ALERTS; changing the size of one they have is always allowed.
async function ensureRoom(userId: number, kind: string, subject: string) {
  const mine = await MoveAlert.list(userId);
  if (mine.length >= MAX_MOVE_ALERTS && !mine.some((a) => a.kind === kind && a.subject === subject)) {
    throw new HttpError(409, `You can have up to ${MAX_MOVE_ALERTS} alerts.`);
  }
}

export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  if (!(await PremiumSubscription.hasAccess(user))) throw new HttpError(403, 'Price and odds alerts are part of Premium.');
  const body = await readJson<{ kind?: unknown; pinId?: unknown; market?: unknown; symbol?: unknown; threshold?: unknown }>(request);
  const threshold = Math.round(Number(body.threshold) * 100) / 100;
  const pinId = Number(body.pinId);
  if (!Number.isInteger(pinId) || !(threshold >= MIN_THRESHOLD && threshold <= MAX_THRESHOLD)) throw new HttpError(400, 'Bad Request');
  if (body.kind === 'market' && typeof body.market === 'string') {
    await ensureRoom(user.id, 'market', body.market);
    const found = await marketOnPin(pinId, body.market);
    if (!found) throw new HttpError(404, 'That pin does not link to this market.');
    const now = await currentValues('market', body.market, found.ref);
    if (!now) throw new HttpError(502, 'The market could not be read just now.');
    const alert = await MoveAlert.set(user.id, { kind: 'market', subject: body.market, label: now.title, ref: found.ref, pinId, threshold, baseline: now.values });
    return json(alert, 201);
  }

  if (body.kind === 'stock') {
    const symbol = normalizeSymbol(body.symbol);
    if (!symbol) throw new HttpError(400, 'Bad Request');
    await ensureRoom(user.id, 'stock', symbol);
    // Only the tickers the pin shows, so an alert is always set from a place the reader saw the stock.
    const onPin = (await PinTicker.forPin(pinId)).find((t) => t.symbol === symbol);
    if (!onPin) throw new HttpError(404, 'That pin does not show this stock.');
    const now = await currentValues('stock', symbol, null);
    if (!now || now.values[STOCK_BASELINE_KEY] == null) throw new HttpError(502, 'The price could not be read just now.');
    const alert = await MoveAlert.set(user.id, { kind: 'stock', subject: symbol, label: `${symbol} · ${onPin.name ?? now.title}`, ref: null, pinId, threshold, baseline: now.values });
    return json(alert, 201);
  }

  throw new HttpError(400, 'Bad Request');
});
