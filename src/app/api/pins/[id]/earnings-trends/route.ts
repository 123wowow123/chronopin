import type { NextRequest } from 'next/server';
import { intParam, json, route } from '@/server/http';
import PinTicker from '@/server/model/pinTicker';
import { fetchEarningsTrends } from '@/server/stocks';

type Ctx = RouteContext<'/api/pins/[id]/earnings-trends'>;

// An earnings pin's "Earnings Trends": the company ticker's EPS against the
// consensus and its revenue against earnings (Nasdaq's public company API).
// Stocks only; null when the pin has no company ticker or Nasdaq has nothing.
// GET /api/pins/:id/earnings-trends   { trends: EarningsTrends | null }
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const tickers = (await PinTicker.forPin(pinId)).filter((t) => t.assetClass === 'stocks');
  const own = tickers.find((t) => t.relation === 'company') ?? null;
  const trends = own ? await fetchEarningsTrends(own.symbol).catch(() => null) : null;
  return json({ trends }, 200, { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600' });
});
