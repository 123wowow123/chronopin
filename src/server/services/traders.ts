import { estimatePnlPercent, type TraderPositionRow } from '@/lib/traders';
import { closeOnOrBefore } from '@/lib/stocks';
import PremiumSubscription from '../model/premiumSubscription';
import TraderPosition from '../model/traderPosition';
import { pushToUser } from '../push';
import { fetchCloses, identify } from '../stocks';
import log from '../util/log';

// Positions of a published trader with the estimated PnL: entry price is the
// close on the trade date (filled the first time it is wanted), last price is
// Nasdaq's delayed quote. Both are estimates, not the trader's own fills.
export async function positionsWithPnl(traderSlug: string): Promise<TraderPositionRow[]> {
  const rows = await TraderPosition.list(traderSlug);
  const lastBySymbol = new Map<string, number | null>();
  for (const row of rows) {
    if (!lastBySymbol.has(row.ticker)) {
      const found = await identify(row.ticker).catch(() => null);
      lastBySymbol.set(row.ticker, found?.quote.price ?? null);
    }
    if (row.entryPrice == null && row.action !== 'hold') {
      const entry = await entryPriceFor(row.ticker, row.tradeDate);
      if (entry != null) {
        row.entryPrice = entry;
        await TraderPosition.setEntryPrice(row.id, entry);
      }
    }
    row.lastPrice = lastBySymbol.get(row.ticker) ?? null;
    row.estimatedPnlPercent = estimatePnlPercent(row, row.lastPrice);
  }
  return rows;
}

export async function entryPriceFor(ticker: string, day: string): Promise<number | null> {
  try {
    const found = await identify(ticker);
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
