import { describe, expect, it } from 'vitest';
import { ADV_DAYS, type DailyBar } from './highVolume';
import { dueTickerAlerts } from './tickerAlerts';

const day = (i: number) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);
// Fifty quiet sessions, then a spike up and a spike down.
const bars: DailyBar[] = [
  ...Array.from({ length: ADV_DAYS }, (_, i) => ({ day: day(i), close: 100, volume: 1000 })),
  { day: day(ADV_DAYS), close: 110, volume: 3000 },
  { day: day(ADV_DAYS + 1), close: 99, volume: 4000 },
];
const at = (i: number) => new Date(`${day(i)}T23:00:00Z`);

describe('dueTickerAlerts', () => {
  it('tells of recent up and down days, oldest first', () => {
    const due = dueTickerAlerts('AAA', bars, at(0), at(ADV_DAYS + 1));
    expect(due.map((a) => [a.symbol, a.day, Math.sign(a.change)])).toEqual([
      ['AAA', day(ADV_DAYS), 1],
      ['AAA', day(ADV_DAYS + 1), -1],
    ]);
  });

  it('says nothing of sessions before the reader added the ticker', () => {
    expect(dueTickerAlerts('AAA', bars, at(ADV_DAYS + 1), at(ADV_DAYS + 1)).map((a) => a.day)).toEqual([day(ADV_DAYS + 1)]);
    expect(dueTickerAlerts('AAA', bars, at(ADV_DAYS + 2), at(ADV_DAYS + 2))).toEqual([]);
  });

  it('leaves old days alone', () => {
    expect(dueTickerAlerts('AAA', bars, at(0), at(ADV_DAYS + 20))).toEqual([]);
  });
});
