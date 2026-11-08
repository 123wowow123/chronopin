import { estimatePnlPercent, pnlExtremes, type TraderPositionRow } from '@/lib/traders';
import { closeOnOrBefore } from '@/lib/stocks';
import PremiumSubscription from '../model/premiumSubscription';
import TraderPosition from '../model/traderPosition';
import { pushToUser } from '../push';
import { fetchCloses, identifyCached } from '../stocks';
import log from '../util/log';

// Positions of a published trader with the estimated PnL: entry price is the
// close on the trade date (filled the first time it is wanted), last price is
// Nasdaq's delayed quote. Both are estimates, not the trader's own fills.
export async function positionsWithPnl(traderSlug: string): Promise<TraderPositionRow[]> {
  const rows = await TraderPosition.list(traderSlug);
  const symbols = [...new Set(rows.map((r) => r.ticker))];
  const lastBySymbol = new Map(
    await Promise.all(
      symbols.map(async (ticker) => {
        const found = await identifyCached(ticker).catch(() => null);
        return [ticker, found?.quote.price ?? null] as const;
      }),
    ),
  );
  await Promise.all(
    rows.map(async (row) => {
      if (row.entryPrice == null) {
        const entry = await entryPriceFor(row.ticker, row.tradeDate);
        if (entry != null) {
          row.entryPrice = entry;
          await TraderPosition.setEntryPrice(row.id, entry);
        }
      }
      row.lastPrice = lastBySymbol.get(row.ticker) ?? null;
      row.estimatedPnlPercent = estimatePnlPercent(row, row.lastPrice);
      const range = pnlExtremes(row, await closesFor(row.ticker), row.lastPrice);
      row.maxGainPercent = range?.maxGainPercent ?? null;
      row.maxDrawdownPercent = range?.maxDrawdownPercent ?? null;
    }),
  );
  return rows;
}

// The moves of all traders since a day, with the estimated PnL, for the bell panel.
// Only the last price is fetched (not the daily range), one lookup per ticker.
export async function recentPositions(since: string, limit: number): Promise<TraderPositionRow[]> {
  const rows = await TraderPosition.since(since, limit);
  const symbols = [...new Set(rows.filter((r) => r.entryPrice && r.entryPrice > 0).map((r) => r.ticker))];
  const lastBySymbol = new Map(
    await Promise.all(
      symbols.map(async (ticker) => {
        const found = await identifyCached(ticker).catch(() => null);
        return [ticker, found?.quote.price ?? null] as const;
      }),
    ),
  );
  for (const row of rows) {
    row.lastPrice = lastBySymbol.get(row.ticker) ?? null;
    row.estimatedPnlPercent = estimatePnlPercent(row, row.lastPrice);
  }
  return rows;
}

async function closesFor(ticker: string) {
  try {
    const found = await identifyCached(ticker);
    return found ? await fetchCloses(ticker, found.assetClass) : [];
  } catch {
    return [];
  }
}

export async function entryPriceFor(ticker: string, day: string): Promise<number | null> {
  try {
    const found = await identifyCached(ticker);
    if (!found) return null;
    const closes = await fetchCloses(ticker, found.assetClass);
    return closeOnOrBefore(closes, day)?.close ?? null;
  } catch (err) {
    log.warn(`[traders] no entry price for ${ticker} ${day}:`, (err as Error).message);
    return null;
  }
}

// Add a position and send it, once, to everyone whose premium plan is on.
export async function addPosition(input: Omit<TraderPositionRow, 'id' | 'entryPrice' | 'lastPrice' | 'estimatedPnlPercent'>, options: { push?: boolean; entryPrice?: number | null } = {}) {
  // A price the post states beats the close read from Nasdaq.
  const entryPrice = options.entryPrice ?? (input.action === 'hold' ? null : await entryPriceFor(input.ticker, input.tradeDate));
  const row = await TraderPosition.insert({ ...input, ticker: input.ticker.toUpperCase(), entryPrice });
  if (row && options.push !== false) await pushPosition(row);
  return row;
}

const VERB: Record<string, string> = { buy: 'bought', sell: 'sold', hold: 'is holding', swap: 'swapped into' };

export async function pushPosition(row: TraderPositionRow) {
  const users = await PremiumSubscription.activeUserIds();
  const payload = {
    title: `${row.traderName} ${VERB[row.action] ?? row.action} ${row.ticker}`,
    body: row.summary.slice(0, 140),
    url: `/person/${row.traderSlug}#premium-trades`,
    image: null,
    tag: `trader-${row.id}`,
  };
  await Promise.all(users.map((id) => pushToUser(id, payload).catch((err) => log.warn(`[traders] push to ${id}:`, (err as Error).message))));
  await TraderPosition.markPushed(row.id);
  return users.length;
}
