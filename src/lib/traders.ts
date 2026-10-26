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
};

// Opening trades have a PnL; sells and holds do not. Puts and shorts gain when
// the underlying falls. Options are priced by their underlying's move, not their
// own premium (no option chain is read), so the figure is a direction guide.
export function estimatePnlPercent(row: Pick<TraderPositionRow, 'instrument' | 'action' | 'entryPrice'>, lastPrice: number | null | undefined): number | null {
  if (row.action !== 'buy' && row.action !== 'swap') return null;
  if (!row.entryPrice || row.entryPrice <= 0 || lastPrice == null) return null;
  const move = ((lastPrice - row.entryPrice) / row.entryPrice) * 100;
  const signed = row.instrument === 'put' || row.instrument === 'short' ? -move : move;
  return Math.round(signed * 10) / 10;
}

// The mean of the opening trades' estimates, for the headline tile.
export function averagePnl(rows: TraderPositionRow[]): number | null {
  const values = rows.map((r) => r.estimatedPnlPercent).filter((v): v is number => typeof v === 'number');
  return values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
}

// The published traders the traderPositions job follows. Their paid posts are
// read by the run in the owner's logged-in Chrome (@browser) and summarized in
// our own words with a link back; never copied (docs/okf/scraping/daily-jobs.md#traderpositions).
export const TRADER_SOURCES = [
  { slug: 'michael-burry', name: 'Michael Burry', archive: 'https://michaeljburry.substack.com/archive', postKind: 'Trading Post / Short Thoughts posts' },
  { slug: 'hfir', name: 'HFI Research', archive: 'https://www.hfir.com/s/trades', postKind: 'trade and position posts' },
  { slug: 'shrubstack', name: 'Le Shrub (Shrubstack)', archive: 'https://www.shrubstack.com/archive', postKind: 'trade and position posts' },
] as const;
