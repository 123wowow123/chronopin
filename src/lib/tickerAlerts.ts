// Alerts on the reader's own tickers: which high-volume days are due to be
// told. Pure: src/server/services/tickerAlerts.ts reads and sends.

import { highVolumeDays, highVolumeSince, type DailyBar } from './highVolume';
import { marketDayOf } from './stocks';

// How far back a run looks: past a weekend, so a missed run loses nothing,
// without telling of old news.
export const ALERT_LOOKBACK_DAYS = 4;

// What a 'ticker' notification carries.
export type TickerAlert = {
  symbol: string;
  // The session ("YYYY-MM-DD").
  day: string;
  // Its close against the previous close, as a fraction: its sign is the direction.
  change: number;
  // Its volume over the average of the 50 sessions before it.
  multiple: number;
};

// A stock's recent high-volume days a reader who added it at `added` should
// hear of: sessions from that New York day on, oldest first.
export function dueTickerAlerts(symbol: string, bars: DailyBar[], added: Date, now: Date = new Date()): TickerAlert[] {
  const recent = highVolumeSince(ALERT_LOOKBACK_DAYS, now.getTime());
  const own = marketDayOf(added);
  return highVolumeDays(bars, recent > own ? recent : own)
    .map(({ day, change, multiple }) => ({ symbol, day, change, multiple }))
    .reverse();
}
