import { personPath } from '@/lib/people';
import { formatAmountRange } from '@/lib/trades';
import Notification from '../model/notification';
import Person from '../model/person';
import PersonTrade, { type TradeFiling } from '../model/personTrade';
import { pushToUser } from '../push';
import log from '../util/log';
import { invalidatePeople } from './cache';

// Saves a person's filing and, when it held trades nobody had stored, tells
// each of their watchers: in the bell, and as a browser notification where
// the watcher allowed them. Never throws on the telling - the trades are
// already saved. Answers with how many trades were new.
export async function storeFiling(personId: number, filing: TradeFiling): Promise<number> {
  const added = await PersonTrade.addFiling(personId, filing);
  if (!added) return 0;
  try {
    // Outside the web server (the importer script) there is no page cache to clear.
    try {
      invalidatePeople();
    } catch {}
    const userIds = (await Notification.createForTradeWatchers({ personId, filingId: filing.filingId })).map((row) => Number(row.userId));
    if (!userIds.length) return added;
    const profile = await Person.profile(personId);
    if (!profile) return added;
    const tickers = [...new Set(filing.trades.map((t) => t.ticker).filter(Boolean))].slice(0, 4).join(', ');
    const biggest = filing.trades.reduce((a, b) => ((b.amountHigh ?? b.amountLow ?? 0) > (a.amountHigh ?? a.amountLow ?? 0) ? b : a));
    const body =
      `${added} new stock trade${added === 1 ? '' : 's'} disclosed${tickers ? `: ${tickers}` : ''}` +
      (biggest.amountLow ? ` (up to ${formatAmountRange(biggest.amountLow, biggest.amountHigh)})` : '');
    await Promise.all(
      userIds.map((userId) =>
        pushToUser(userId, { title: profile.name, body, url: `${personPath(profile.name)}#trades`, image: profile.photoUrl ?? null, tag: `trade-${personId}-${filing.filingId}` }),
      ),
    );
  } catch (err) {
    log.warn(`telling person ${personId}'s trade watchers failed:`, (err as Error).message);
  }
  return added;
}
