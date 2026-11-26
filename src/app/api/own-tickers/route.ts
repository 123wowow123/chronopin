import type { NextRequest } from 'next/server';
import { MAX_OWN_TICKERS } from '@/lib/ownTickers';
import { normalizeSymbol } from '@/lib/stocks';
import { requireUser } from '@/server/auth';
import { HttpError, json, readJson, route } from '@/server/http';
import OwnTicker from '@/server/model/ownTicker';

// The signed-in reader's tickers on the trades pages (docs/okf/api/own-tickers.md).
// Each answers with the list as it then stands.
export const GET = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  return json({ symbols: await OwnTicker.list(user.id) });
});

// Body: { symbols: ["NVDA", ...] }. Those past the cap are left out.
export const POST = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const { symbols } = await readJson<{ symbols?: unknown }>(request);
  const list = Array.isArray(symbols) && symbols.length && symbols.length <= MAX_OWN_TICKERS ? symbols.map(normalizeSymbol) : [];
  if (!list.length || list.includes(null)) throw new HttpError(400, `symbols takes 1 to ${MAX_OWN_TICKERS} tickers`);
  return json({ symbols: await OwnTicker.add(user.id, [...new Set(list as string[])]) });
});

// DELETE /api/own-tickers?symbol=NVDA
export const DELETE = route(async (request: NextRequest) => {
  const user = await requireUser(request);
  const symbol = normalizeSymbol(request.nextUrl.searchParams.get('symbol'));
  if (!symbol) throw new HttpError(400, 'symbol takes a ticker');
  return json({ symbols: await OwnTicker.remove(user.id, symbol) });
});
