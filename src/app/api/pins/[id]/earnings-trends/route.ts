import type { NextRequest } from 'next/server';
import { withAnnual } from '@/lib/earningsTrends';
import { annualFor } from '@/server/earningsAnnual';
import * as db from '@/server/db';
import { intParam, json, route } from '@/server/http';
import PinTicker from '@/server/model/pinTicker';
import { fetchEarningsTrends } from '@/server/stocks';

type Ctx = RouteContext<'/api/pins/[id]/earnings-trends'>;

// An earnings pin's "Earnings Trends": the company ticker's EPS against the
// consensus and its revenue against earnings (Nasdaq's public company API).
// A company with no US listing, or an ADR Nasdaq has no income statement for,
// gets its kept annual figures instead (src/server/data/earningsAnnual.json).
// GET /api/pins/:id/earnings-trends   { trends: EarningsTrends | null }
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const pinId = intParam((await ctx.params).id);
  const tickers = (await PinTicker.forPin(pinId)).filter((t) => t.assetClass === 'stocks');
  const own = tickers.find((t) => t.relation === 'company') ?? null;
  const [{ name } = { name: null }] = await db.query<{ name: string | null }>(`SELECT co."name" FROM "Pin" p JOIN "Company" co ON co."id" = p."companyId" WHERE p."id" = $1`, [pinId]);
  const nasdaq = own ? await fetchEarningsTrends(own.symbol).catch(() => null) : null;
  const trends = name ? withAnnual(nasdaq, annualFor(name), name, own?.symbol ?? '') : nasdaq;
  return json({ trends }, 200, { 'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600' });
});
