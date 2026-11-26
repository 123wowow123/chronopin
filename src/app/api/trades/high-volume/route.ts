import type { NextRequest } from 'next/server';
import { HIGH_VOLUME_SYMBOLS, highVolumeDays, highVolumeSince, recentTrend, type Trend } from '@/lib/highVolume';
import { normalizeSymbol } from '@/lib/stocks';
import { HttpError, json, route } from '@/server/http';
import { fetchDailyBars } from '@/server/stocks';

// Nasdaq reads in flight at once, per request.
const PARALLEL = 8;

// Which of the symbols closed higher or lower on at least twice their 50-day
// average volume in the last `days` calendar days, today included (1 to 84,
// default 14); a day's `change` tells which way, and a stock's `trend` which
// way its last three sessions all went, if they did. `unchecked` lists those Nasdaq gave no prices for.
// GET /api/trades/high-volume?symbols=NVDA,T[&days=14]
export const GET = route(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const symbols = [...new Set((params.get('symbols') ?? '').split(',').map(normalizeSymbol).filter((s) => s !== null))];
  if (!symbols.length || symbols.length > HIGH_VOLUME_SYMBOLS) {
    throw new HttpError(400, `symbols takes 1 to ${HIGH_VOLUME_SYMBOLS} tickers`);
  }
  const days = Math.min(Math.max(parseInt(params.get('days') ?? '', 10) || 14, 1), 84);
  const since = highVolumeSince(days);
  const stocks: { symbol: string; days: ReturnType<typeof highVolumeDays>; trend: Trend }[] = [];
  const unchecked: string[] = [];
  for (let i = 0; i < symbols.length; i += PARALLEL) {
    await Promise.all(
      symbols.slice(i, i + PARALLEL).map(async (symbol) => {
        const bars = await fetchDailyBars(symbol).catch(() => []);
        if (!bars.length) return void unchecked.push(symbol);
        const hits = highVolumeDays(bars, since);
        if (hits.length) stocks.push({ symbol, days: hits, trend: recentTrend(bars) });
      }),
    );
  }
  return json({ stocks, unchecked });
});
