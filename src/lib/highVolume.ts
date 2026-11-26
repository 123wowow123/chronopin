// "High volume day": a stock closes higher (an up day) or lower (a down day)
// than the day before on at least HIGH_VOLUME_MULTIPLE times its average volume
// of the ADV_DAYS trading days before it. Pure: the server reads the bars (src/server/stocks.ts).

export const HIGH_VOLUME_MULTIPLE = 2;
export const ADV_DAYS = 50;
// The latest sessions the "past 3 days" column reads.
export const TREND_DAYS = 3;
// The most symbols one GET /api/trades/high-volume checks.
export const HIGH_VOLUME_SYMBOLS = 40;

export type DailyBar = { day: string; close: number; volume: number };

export type HighVolumeDay = {
  day: string;
  // The day's close against the previous close, as a fraction.
  change: number;
  // The day's volume over the average of the ADV_DAYS before it.
  multiple: number;
  // The latest close against the day's close, as a fraction.
  sinceChange: number;
  // The sessions after the day, to the latest close, that closed higher and
  // lower than the one before; an unchanged close counts as neither.
  up: number;
  down: number;
};

export type Trend = 'up' | 'down' | null;

// Which way the last TREND_DAYS sessions all went, each against the close
// before it: null when they differ, one was unchanged, or there are too few.
// `bars` may be in any order.
export function recentTrend(bars: DailyBar[]): Trend {
  const closes = [...bars].sort((a, b) => a.day.localeCompare(b.day)).slice(-(TREND_DAYS + 1)).map((b) => b.close);
  if (closes.length <= TREND_DAYS) return null;
  const moves = closes.slice(1).map((close, i) => close - closes[i]);
  return moves.every((m) => m > 0) ? 'up' : moves.every((m) => m < 0) ? 'down' : null;
}

// The first calendar day ("YYYY-MM-DD", UTC) of a span of the last `days`
// days, today included.
export const highVolumeSince = (days: number, now: number = Date.now()) => new Date(now - (days - 1) * 86_400_000).toISOString().slice(0, 10);

// The qualifying days on or after `since` ("YYYY-MM-DD"), up and down days
// together (`change` tells which), newest first. `bars` may be in any order. A
// day with fewer than ADV_DAYS before it (a new listing) cannot qualify, nor
// can an unchanged close.
export function highVolumeDays(bars: DailyBar[], since: string): HighVolumeDay[] {
  const sorted = [...bars].sort((a, b) => a.day.localeCompare(b.day));
  const out: HighVolumeDay[] = [];
  let sum = 0;
  for (let i = 0; i < sorted.length; i++) {
    if (i >= ADV_DAYS) {
      const { day, close, volume } = sorted[i];
      const prev = sorted[i - 1].close;
      const average = sum / ADV_DAYS;
      if (day >= since && close !== prev && prev > 0 && average > 0 && volume >= HIGH_VOLUME_MULTIPLE * average) {
        let up = 0;
        let down = 0;
        for (let j = i + 1; j < sorted.length; j++) {
          if (sorted[j].close > sorted[j - 1].close) up++;
          else if (sorted[j].close < sorted[j - 1].close) down++;
        }
        out.push({ day, change: close / prev - 1, multiple: volume / average, sinceChange: sorted[sorted.length - 1].close / close - 1, up, down });
      }
      sum -= sorted[i - ADV_DAYS].volume;
    }
    sum += sorted[i].volume;
  }
  return out.reverse();
}
