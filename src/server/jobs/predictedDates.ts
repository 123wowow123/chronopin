// Predicted pins whose date needs another look, for the news job's
// predicted_date_checks tool (docs/okf/scraping/daily-jobs.md#predicted-dates).
// An estimated date taken from a market goes stale as the odds move, and reads
// as "Started" once it passes with the event still not here.

import * as db from '../db';
import { pinMarketRefs, type MarketOdds } from '@/lib/predictionMarkets';
import { dayKeyIn } from '@/lib/format';
import { marketState } from '../predictionMarkets';
import log from '../util/log';

const MAX_PINS_READ = 150;

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';
const DATE_LABEL = new RegExp(`^(?:(?:on or )?(?:before|by|after)\\s+)?(?:${MONTH}(?:\\s+\\d{1,2}(?:st|nd|rd|th)?)?(?:,?\\s*\\d{4})?|q[1-4]\\s*\\d{4}|(?:end of\\s+)?20\\d\\d)$`, 'i');

// A market asking "when": every outcome is a date ("December 31", "Before Jan 1, 2027").
export const isDateLadder = (labels: string[]): boolean => labels.length > 1 && labels.every((label) => DATE_LABEL.test(label.trim()));

// missed: the pin's day has passed and the market is still open, so the event
// has not come. resolved: the market has closed and the date is still an
// estimate. ladder: an open "when" market, whose likeliest window may have moved.
// odds: an open market, date still ahead, whose title quotes odds that were not
// refreshed in the last 12 hours (owner, 2026-11-26: retitle with the odds).
export type DateCheckReason = 'missed' | 'resolved' | 'ladder' | 'odds';

// Which come first when there are more than the limit.
const ORDER: Record<DateCheckReason, number> = { missed: 0, ladder: 1, resolved: 2, odds: 3 };

const STALE_MS = 12 * 3600 * 1000;
// A title like "Priced at 55% to Begin by ..." goes stale as the odds move.
export const titleQuotesOdds = (title: string): boolean => /\d(?:\.\d+)?\s?%/.test(title);
export const oddsTitleStale = (title: string, updated: Date | string | null, now = Date.now()): boolean =>
  titleQuotesOdds(title) && (!updated || now - new Date(updated).getTime() > STALE_MS);

export function dateCheckReason(startDay: string, today: string, odds: Pick<MarketOdds, 'closed' | 'outcomes'>, staleOddsTitle = false): DateCheckReason | null {
  const passed = startDay < today;
  if (odds.closed) return passed ? 'resolved' : null;
  if (passed) return 'missed';
  if (isDateLadder(odds.outcomes.map((o) => o.label))) return 'ladder';
  return staleOddsTitle ? 'odds' : null;
}

type Row = { id: number; title: string; sourceUrl: string | null; utcStartDateTime: Date; originalStartDate: string | null; utcUpdatedDateTime: Date | null; references: { url: string }[] };

export async function predictedDateChecks({ limit = 25, exclude = [] as number[] } = {}) {
  // Passed dates read first, then the pins left alone longest.
  const rows = await db.query<Row>(
    `SELECT "p"."id", "p"."title", "p"."sourceUrl", "p"."utcStartDateTime", to_char("p"."originalStartDate", 'YYYY-MM-DD') AS "originalStartDate", "p"."utcUpdatedDateTime",
       COALESCE((SELECT json_agg(json_build_object('url', "r"."url")) FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id"), '[]'::json) AS "references"
     FROM "Pin" AS "p"
     WHERE "p"."utcDeletedDateTime" IS NULL AND "p"."dateConfidence" = 'estimated' AND NOT "p"."id" = ANY($1::int[])
       AND ("p"."sourceUrl" ~* '(kalshi\\.com|polymarket\\.(com|us))/'
         OR EXISTS (SELECT 1 FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id" AND "r"."url" ~* '(kalshi\\.com|polymarket\\.(com|us))/'))
     ORDER BY ("p"."utcStartDateTime" < now()) DESC, "p"."utcUpdatedDateTime" ASC NULLS FIRST, "p"."id"`,
    [exclude],
  );
  const today = dayKeyIn(new Date().toISOString(), 'UTC');
  const pins = [];
  let read = 0;
  for (const row of rows) {
    if (read >= MAX_PINS_READ) break;
    read++;
    for (const ref of pinMarketRefs(row)) {
      const odds = await marketState(ref).catch((err) => {
        log.warn(`reading pin ${row.id}'s market ${ref.url} failed:`, (err as Error).message);
        return undefined;
      });
      if (!odds?.outcomes.length) continue;
      const reason = dateCheckReason(dayKeyIn(new Date(row.utcStartDateTime).toISOString(), 'UTC'), today, odds, oddsTitleStale(row.title, row.utcUpdatedDateTime));
      if (!reason) continue;
      pins.push({
        id: row.id,
        title: row.title,
        sourceUrl: row.sourceUrl,
        utcStartDateTime: new Date(row.utcStartDateTime).toISOString(),
        originalStartDate: row.originalStartDate,
        utcUpdatedDateTime: row.utcUpdatedDateTime,
        reason,
        market: { url: odds.url, title: odds.title, volume: odds.volume ?? null, closed: odds.closed, closeTime: odds.closeTime ?? null, outcomes: odds.outcomes.slice(0, 15).map((o) => ({ label: o.label, probability: o.probability })) },
      });
      break;
    }
  }
  // A stable sort, so each reason keeps the reading order.
  pins.sort((a, b) => ORDER[a.reason] - ORDER[b.reason]);
  return { candidates: rows.length, read, found: pins.length, pins: pins.slice(0, limit) };
}
