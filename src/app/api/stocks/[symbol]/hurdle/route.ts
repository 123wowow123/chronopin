import type { NextRequest } from 'next/server';
import { C_IV15, HURDLE } from '@/lib/hurdlePrice';
import { normalizeSymbol } from '@/lib/stocks';
import { getUser } from '@/server/auth';
import { HttpError, json, route } from '@/server/http';
import PremiumSubscription from '@/server/model/premiumSubscription';
import { loadHurdle } from '@/server/hurdle';

type Ctx = RouteContext<'/api/stocks/[symbol]/hurdle'>;

// C-IV15, Chronopin's 15%-hurdle price, for a US-listed filer: the price at which
// 15% a year would be returned for 15 years on the stock's owners' earnings. It is
// an estimate made from SEC filings and default assumptions.
// GET /api/stocks/:symbol/hurdle   { formula, copyright, symbol, price, hurdlePrice, ratio, growth, roic, stockCompWeight, leveraged, sharesFromMarketCap, foreign, convertedFrom, tier, score, sic, fiscalYearEnd, assumptions }
// 403 without Premium; 404 when there are no 10-K facts, the earnings are a loss, or the price is unknown.
export const GET = route(async (request: NextRequest, ctx: Ctx) => {
  // C-IV15 is a Premium feature: readers without Premium (and admins aside) get 403.
  const user = await getUser(request);
  if (!user || !(await PremiumSubscription.hasAccess(user))) throw new HttpError(403, 'Premium');
  const symbol = normalizeSymbol((await ctx.params).symbol);
  if (!symbol) throw new HttpError(400, '', { message: 'A ticker is 1-10 letters, digits, dots or dashes, like MSFT' });
  const h = await loadHurdle(symbol);
  if (!h) throw new HttpError(404, 'Not Found');
  return json({
    formula: C_IV15.name,
    copyright: C_IV15.copyright,
    symbol,
    price: h.price,
    hurdlePrice: h.hurdle.price,
    dividendModel: h.hurdle.dividendModel,
    exitModel: h.hurdle.exitModel,
    ratio: h.ratio,
    growth: h.growth,
    roic: h.roic,
    stockCompWeight: h.stockCompWeight,
    leveraged: h.leveraged,
    sharesFromMarketCap: h.sharesFromMarketCap,
    foreign: h.foreign,
    convertedFrom: h.convertedFrom,
    tier: h.tier,
    score: h.score,
    sic: h.sic,
    fiscalYearEnd: h.fiscalYearEnd,
    assumptions: HURDLE,
  }, 200, { 'Cache-Control': 'private, max-age=3600' });
});
