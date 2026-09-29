import type { NextRequest } from 'next/server';
import { MAX_PIN_TICKERS, normalizeSymbol, STOCK_RELATIONS, type StockRelation } from '@/lib/stocks';
import { isAdmin, requireUser } from '@/server/auth';
import { HttpError, intParam, json, readJson, route } from '@/server/http';
import Pin from '@/server/model/pin';
import PinTicker from '@/server/model/pinTicker';
import { syncPinStocks } from '@/server/services/pinStocks';
import { identify } from '@/server/stocks';

type Ctx = RouteContext<'/api/pins/[id]/stocks'>;

// A pin's stock tickers with the price when it was posted and the close on
// each start date it has had (src/server/services/pinStocks.ts). Snapshots
// that have come due are priced on the way. The live price is on the live feed.
// GET /api/pins/:id/stocks   { stocks }
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  return json({ stocks: await syncPinStocks(pinId, { lookup: false }) });
});

// Adds or takes off a ticker: the pin's author or an admin.
// PUT /api/pins/:id/stocks { add: "MSFT", relation?: "related", note?: "..." } | { remove: "MSFT" }
// relation is the pin's company itself, a related company or a supplier (default related).
export const PUT = route(async (request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const user = await requireUser(request);
  const { pin } = await Pin.queryById(pinId);
  if (!pin) {
    throw new HttpError(404, 'Not Found');
  }
  if (!isAdmin(user) && Number(pin.userId) !== Number(user.id)) {
    throw new HttpError(403, 'Forbidden');
  }
  const body = await readJson<{ add?: unknown; remove?: unknown; relation?: unknown; note?: unknown }>(request);
  if (body.remove !== undefined) {
    const symbol = normalizeSymbol(body.remove);
    if (!symbol || !(await PinTicker.remove(pinId, symbol))) {
      throw new HttpError(404, '', { message: 'The pin has no such ticker' });
    }
  } else {
    const symbol = normalizeSymbol(body.add);
    if (!symbol) {
      throw new HttpError(400, '', { message: 'A ticker is 1-10 letters, digits, dots or dashes, like MSFT' });
    }
    const current = await PinTicker.forPin(pinId);
    if (!current.some((t) => t.symbol === symbol) && current.length >= MAX_PIN_TICKERS) {
      throw new HttpError(400, '', { message: `A pin has at most ${MAX_PIN_TICKERS} tickers` });
    }
    const relation = (body.relation ?? 'related') as StockRelation;
    if (!STOCK_RELATIONS.includes(relation)) {
      throw new HttpError(400, '', { message: `relation is one of ${STOCK_RELATIONS.join(', ')}` });
    }
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim().slice(0, 300) : null;
    const listing = await identify(symbol);
    if (!listing) {
      throw new HttpError(400, '', { message: `Nasdaq has no US stock or ETF ${symbol}` });
    }
    await PinTicker.add(pinId, { symbol, name: listing.quote.name, assetClass: listing.assetClass, origin: 'manual', relation, note });
  }
  return json({ stocks: await syncPinStocks(pinId, { lookup: false }) });
});
