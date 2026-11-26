import { localeOr, type Locale } from '@/lib/i18n/config';
import type { Translator } from '@/lib/i18n/translate';
import { dueTickerAlerts, type TickerAlert } from '@/lib/tickerAlerts';
import { emitWatchAlert, type WatchAlert } from '../events';
import Notification from '../model/notification';
import OwnTicker from '../model/ownTicker';
import { pushToUser } from '../push';
import { fetchDailyBars } from '../stocks';
import log from '../util/log';
import { localesOf, translatorFor } from './watchAlerts';

// Alerts on readers' own tickers (OwnTicker, 0270), run by the news job's
// tickerAlerts task: each stock is read once, however many readers hold it,
// and a reader is told of a new high-volume up or down day in the bell, over
// the live feed and as a Web Push. The notification's unique index leaves one
// per reader, stock and session, so a run repeated tells nobody twice.

const READ_CONCURRENCY = 4;

export type TickerAlertRun = {
  // Distinct stocks held, and those Nasdaq gave no prices for.
  symbols: number;
  unchecked: string[];
  // Notifications newly written.
  sent: number;
};

async function tell(userId: number, alert: TickerAlert, t: Translator, locale: Locale) {
  const day = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(alert.day));
  const change = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 }).format(Math.abs(alert.change));
  const multiple = new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(alert.multiple);
  const push: WatchAlert = {
    userId,
    pinId: 0,
    type: 'ticker',
    title: alert.symbol,
    body: t(alert.change > 0 ? 'notifications.tickerUp' : 'notifications.tickerDown', { symbol: alert.symbol, change, multiple, day }),
    url: '/trades',
    image: null,
    tag: `ticker-${alert.symbol}-${alert.day}`,
  };
  emitWatchAlert(push);
  await pushToUser(userId, push);
}

export async function checkTickerAlerts(now = new Date()): Promise<TickerAlertRun> {
  const rows = await OwnTicker.all();
  const bySymbol = new Map<string, typeof rows>();
  for (const row of rows) bySymbol.set(row.symbol, [...(bySymbol.get(row.symbol) ?? []), row]);
  const locales = await localesOf([...new Set(rows.map((row) => Number(row.userId)))]);
  const translators = new Map<Locale, Promise<Translator>>();
  const unchecked: string[] = [];
  let sent = 0;

  const work = async ([symbol, holders]: [string, typeof rows]) => {
    const bars = await fetchDailyBars(symbol).catch(() => []);
    if (!bars.length) return void unchecked.push(symbol);
    for (const holder of holders) {
      const userId = Number(holder.userId);
      for (const alert of dueTickerAlerts(symbol, bars, new Date(holder.added), now)) {
        try {
          if (!(await Notification.createTicker({ userId, ticker: alert })).length) continue;
          sent++;
          const locale = locales.get(userId) ?? localeOr(undefined);
          if (!translators.has(locale)) translators.set(locale, translatorFor(locale));
          await tell(userId, alert, await translators.get(locale)!, locale);
        } catch (err) {
          log.warn(`ticker alert ${symbol} for user ${userId} failed:`, (err as Error).message);
        }
      }
    }
  };

  const groups = [...bySymbol];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(READ_CONCURRENCY, groups.length) }, async () => {
      while (next < groups.length) await work(groups[next++]);
    }),
  );
  return { symbols: groups.length, unchecked: unchecked.sort(), sent };
}
