// Trader positions (0223) and their estimated PnL. Shared by the server and
// the page, so it holds only types and arithmetic.

export const INSTRUMENTS = ['stock', 'call', 'put', 'short'] as const;
export const ACTIONS = ['buy', 'sell', 'hold', 'swap'] as const;
export type Instrument = (typeof INSTRUMENTS)[number];
export type TraderAction = (typeof ACTIONS)[number];

export type TraderPositionRow = {
  id: number;
  traderSlug: string;
  traderName: string;
  ticker: string;
  instrument: Instrument;
  action: TraderAction;
  tradeDate: string;
  summary: string;
  sourceUrl: string;
  sourceTitle: string;
  entryPrice: number | null;
  // The last price of the underlying, when asked for.
  lastPrice?: number | null;
  // Estimated move of the position since the trade, in percent; null when it has none.
  estimatedPnlPercent?: number | null;
  // Best and worst estimated PnL at any daily close since the trade date (the
  // latest quote included): a gain >= 0 and a drawdown <= 0.
  maxGainPercent?: number | null;
  maxDrawdownPercent?: number | null;
};

// Buys, swaps and holds gain as the position's direction moves from the trade
// date; a sell is read as an exit, so it scores the move the other way (positive
// when the underlying fell after the sale). Puts and shorts gain when the
// underlying falls. Options are priced by their underlying's move, not their
// own premium (no option chain is read), so the figure is a direction guide.
export function estimatePnlPercent(row: Pick<TraderPositionRow, 'instrument' | 'action' | 'entryPrice'>, lastPrice: number | null | undefined): number | null {
  if (!row.entryPrice || row.entryPrice <= 0 || lastPrice == null) return null;
  const move = ((lastPrice - row.entryPrice) / row.entryPrice) * 100;
  const direction = row.instrument === 'put' || row.instrument === 'short' ? -1 : 1;
  const signed = (row.action === 'sell' ? -1 : 1) * direction * move;
  return Math.round(signed * 10) / 10 || 0;
}

// The largest gain and drawdown the position showed from the trade date to now,
// scored on daily closes plus the latest quote (intraday extremes are not read).
export function pnlExtremes(
  row: Pick<TraderPositionRow, 'instrument' | 'action' | 'entryPrice' | 'tradeDate'>,
  closes: { day: string; close: number }[],
  lastPrice: number | null | undefined,
): { maxGainPercent: number; maxDrawdownPercent: number } | null {
  const prices = closes.filter((c) => c.day >= row.tradeDate).map((c) => c.close);
  if (lastPrice != null) prices.push(lastPrice);
  let gain = 0;
  let drawdown = 0;
  let any = false;
  for (const price of prices) {
    const v = estimatePnlPercent(row, price);
    if (v == null) continue;
    any = true;
    gain = Math.max(gain, v);
    drawdown = Math.min(drawdown, v);
  }
  return any ? { maxGainPercent: gain, maxDrawdownPercent: drawdown } : null;
}

// The mean of the opening trades' estimates, for the headline tile.
export function averagePnl(rows: TraderPositionRow[]): number | null {
  const values = rows.filter((r) => r.action === 'buy' || r.action === 'swap').map((r) => r.estimatedPnlPercent).filter((v): v is number => typeof v === 'number');
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
}

// The published traders the traderPositions job follows. Their paid posts are
// read by the run in the owner's logged-in Chrome (@browser) and summarized in
// our own words with a link back; never copied (docs/okf/scraping/daily-jobs.md#traderpositions).
export const TRADER_SOURCES = [
  { slug: 'michael-burry', name: 'Michael Burry', archive: 'https://michaeljburry.substack.com/archive', postKind: 'Trading Post / Short Thoughts posts' },
  { slug: 'hfi-research', name: 'HFI Research', archive: 'https://www.hfir.com/s/trades', postKind: 'trade and position posts' },
  { slug: 'le-shrub', name: 'Le Shrub', archive: 'https://www.shrubstack.com/archive', postKind: 'trade and position posts' },
] as const;
