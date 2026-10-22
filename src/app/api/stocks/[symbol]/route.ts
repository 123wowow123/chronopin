import type { NextRequest } from 'next/server';
import { normalizeSymbol } from '@/lib/stocks';
import { HttpError, json, route } from '@/server/http';
import { fetchCloses, identifyCached } from '@/server/stocks';

type Ctx = RouteContext<'/api/stocks/[symbol]'>;

// A listed stock's last year of daily closes and its latest price: the graph
// on a company's search panel.
// GET /api/stocks/:symbol   { symbol, name, price, change, changePercent, closes: [{ day, close }] }
export const GET = route(async (_request: NextRequest, ctx: Ctx) => {
  const symbol = normalizeSymbol((await ctx.params).symbol);
  if (!symbol) throw new HttpError(400, '', { message: 'A ticker is 1-10 letters, digits, dots or dashes, like MSFT' });
  const listing = await identifyCached(symbol);
  if (!listing) throw new HttpError(404, 'Not Found');
  const since = new Date(Date.now() - 366 * 864e5).toISOString().slice(0, 10);
  const closes = (await fetchCloses(symbol, listing.assetClass)).filter((c) => c.day >= since).sort((a, b) => a.day.localeCompare(b.day));
  const { quote } = listing;
  return json({ symbol, name: quote.name, price: quote.price, change: quote.change, changePercent: quote.changePercent, closes }, 200, { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' });
});
