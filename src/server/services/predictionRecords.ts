// The track record of the markets behind Predicted pins (schema 0233), shown on
// /predictions. A pin's markets are recorded with the odds they gave when it
// first cited them, then marked settled once the exchange closes them.
//
// Written from three places: a save or edit of a Predicted pin records its
// markets (events.ts), the news job's prediction_accuracy tool and an hourly
// timer record the rest and settle what has closed.

import { favoriteWon, scoreMarket, settlement, summarize, type AccuracySummary, type OutcomeOdds } from '@/lib/predictionAccuracy';
import { pinMarketRefs, type MarketOdds, type MarketRef } from '@/lib/predictionMarkets';
import * as db from '../db';
import { oddsFor, priceAt } from '../predictionMarkets';
import log from '../util/log';

const MAX_OUTCOMES = 25;
const CHECK_MS = 60 * 60_000;
// A settled market that was never recorded is scored on its price this long before it closed.
export const HISTORICAL_DAYS = 7;

type PinLinks = { id: number; sourceUrl: string | null; references: { url: string | null }[] };

const LINKS_SQL = `
  SELECT "p"."id", "p"."sourceUrl",
         COALESCE((SELECT json_agg(json_build_object('url', "r"."url"))
                   FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id"), '[]'::json) AS "references"
  FROM "Pin" AS "p"
  WHERE "p"."utcDeletedDateTime" IS NULL
    AND ("p"."dateConfidence" = 'estimated'
         OR EXISTS (SELECT 1 FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."name" = 'Predicted'::citext))`;

function outcomesOf(odds: MarketOdds): OutcomeOdds[] {
  return odds.outcomes.slice(0, MAX_OUTCOMES).map((o) => ({ label: o.label, probability: o.probability }));
}

export type RecordSync = { recorded: number; settled: number; voided: number; skipped: number };

async function syncRef(pinId: number, ref: MarketRef, tally: RecordSync, apply: boolean) {
  const [existing] = await db.query<{ id: number; status: string }>(
    `SELECT "id", "status" FROM "PredictionRecord" WHERE "pinId" = $1 AND "marketUrl" = $2`,
    [pinId, ref.url],
  );
  if (existing && existing.status !== 'open') return;
  const odds = await oddsFor(ref);
  if (!odds || !odds.outcomes.length) return;

  if (!existing) {
    // Settled before it was first seen: the odds it was written with are unknown.
    if (odds.closed) {
      tally.skipped++;
      return;
    }
    if (apply) {
      await db.query(
        `INSERT INTO "PredictionRecord" ("pinId", "marketUrl", "source", "question", "outcomes", "volume", "closeTime")
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT ("pinId", "marketUrl") DO NOTHING`,
        [pinId, ref.url, odds.source, odds.title, JSON.stringify(outcomesOf(odds)), odds.volume ?? null, odds.closeTime ?? null],
      );
    }
    tally.recorded++;
    return;
  }

  if (!odds.closed) return;
  const final = outcomesOf(odds);
  const status = settlement(final);
  if (apply) {
    await db.query(
      `UPDATE "PredictionRecord" SET "status" = $2, "finalOutcomes" = $3, "utcResolvedDateTime" = now() WHERE "id" = $1`,
      [existing.id, status, JSON.stringify(final)],
    );
  }
  if (status === 'resolved') tally.settled++;
  else tally.voided++;
}

async function syncLinks(pin: PinLinks, apply: boolean): Promise<RecordSync> {
  const tally: RecordSync = { recorded: 0, settled: 0, voided: 0, skipped: 0 };
  for (const ref of pinMarketRefs(pin)) {
    try {
      await syncRef(pin.id, ref, tally, apply);
    } catch (err) {
      log.warn(`prediction record for pin ${pin.id} (${ref.url}) failed:`, (err as Error).message);
    }
  }
  return tally;
}

// Records and settles one Predicted pin's markets.
export async function syncPinRecords(pinId: number, { apply = true } = {}): Promise<RecordSync> {
  const [pin] = await db.query<PinLinks>(`${LINKS_SQL} AND "p"."id" = $1`, [pinId]);
  return pin ? syncLinks(pin, apply) : { recorded: 0, settled: 0, voided: 0, skipped: 0 };
}

// Every Predicted pin that has a market not yet settled in the record: new
// pins first, then the open ones, so a settlement is found within the hour.
export async function syncAllRecords({ apply = true, limit = 200 } = {}): Promise<RecordSync & { pins: number }> {
  const pins = await db.query<PinLinks>(
    `${LINKS_SQL}
     ORDER BY (SELECT count(*) FROM "PredictionRecord" AS "x" WHERE "x"."pinId" = "p"."id") ASC, "p"."id" DESC
     LIMIT $1`,
    [limit],
  );
  const total = { recorded: 0, settled: 0, voided: 0, skipped: 0, pins: 0 };
  for (const pin of pins) {
    if (!pinMarketRefs(pin).length) continue;
    const tally = await syncLinks(pin, apply);
    total.pins++;
    total.recorded += tally.recorded;
    total.settled += tally.settled;
    total.voided += tally.voided;
    total.skipped += tally.skipped;
  }
  return total;
}

export type Backfill = { pins: number; markets: number; recorded: number; noHistory: number; open: number };

// Scores markets that settled before they were ever recorded, on their price
// HISTORICAL_DAYS before they closed (basis 'historical'). Markets without a
// price history that far back are skipped, and Polymarket US keeps none.
export async function backfillHistoricalRecords({ apply = true, limit = 1000 } = {}): Promise<Backfill> {
  const pins = await db.query<PinLinks>(
    `SELECT "p"."id", "p"."sourceUrl",
            COALESCE((SELECT json_agg(json_build_object('url', "r"."url"))
                      FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id"), '[]'::json) AS "references"
     FROM "Pin" AS "p"
     WHERE "p"."utcDeletedDateTime" IS NULL
       AND ("p"."sourceUrl" ~* '(kalshi\\.com|polymarket\\.(com|us))/'
            OR EXISTS (SELECT 1 FROM "PinReference" AS "x" WHERE "x"."pinId" = "p"."id" AND "x"."url" ~* '(kalshi\\.com|polymarket\\.(com|us))/'))
     ORDER BY "p"."id" LIMIT $1`,
    [limit],
  );
  const tally: Backfill = { pins: 0, markets: 0, recorded: 0, noHistory: 0, open: 0 };
  for (const pin of pins) {
    const refs = pinMarketRefs(pin);
    if (!refs.length) continue;
    tally.pins++;
    for (const ref of refs) {
      try {
        const [existing] = await db.query(`SELECT 1 FROM "PredictionRecord" WHERE "pinId" = $1 AND "marketUrl" = $2`, [pin.id, ref.url]);
        if (existing) continue;
        const odds = await oddsFor(ref);
        if (!odds?.closed || !odds.closeTime) {
          if (odds && !odds.closed) tally.open++;
          continue;
        }
        tally.markets++;
        const at = Math.floor(Date.parse(odds.closeTime) / 1000) - HISTORICAL_DAYS * 86_400;
        const final = outcomesOf(odds);
        const before: OutcomeOdds[] = [];
        for (const o of odds.outcomes.slice(0, MAX_OUTCOMES)) {
          const probability = o.history ? await priceAt(o.history, at).catch(() => null) : null;
          if (probability != null) before.push({ label: o.label, probability });
        }
        if (!before.length) {
          tally.noHistory++;
          continue;
        }
        if (apply) {
          await db.query(
            `INSERT INTO "PredictionRecord" ("pinId", "marketUrl", "source", "question", "outcomes", "volume", "closeTime", "status",
                                             "finalOutcomes", "basis", "utcSnapshotDateTime", "utcResolvedDateTime")
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'historical', to_timestamp($10), $7) ON CONFLICT ("pinId", "marketUrl") DO NOTHING`,
            [pin.id, ref.url, odds.source, odds.title, JSON.stringify(before), odds.volume ?? null, odds.closeTime, settlement(final), JSON.stringify(final), at],
          );
        }
        tally.recorded++;
      } catch (err) {
        log.warn(`historical record for pin ${pin.id} (${ref.url}) failed:`, (err as Error).message);
      }
    }
  }
  return tally;
}

export type PredictionEntry = {
  id: number;
  pinId: number;
  pinTitle: string;
  question: string;
  source: string;
  marketUrl: string;
  status: 'open' | 'resolved' | 'void';
  basis: 'live' | 'historical';
  volume: number | null;
  snapshotAt: string;
  resolvedAt: string | null;
  closeTime: string | null;
  // The market's favorite when first read, and its chance then.
  favorite: { label: string; probability: number } | null;
  // What settled yes (resolved markets only).
  winner: string | null;
  favoriteWon: boolean | null;
  // The pin's date: still a prediction, confirmed, or moved from its first date.
  pinDateConfidence: string;
  pinStart: string;
  pinOriginalStart: string | null;
};

export type PredictionReport = { live: AccuracySummary; historical: AccuracySummary; open: number; voided: number; entries: PredictionEntry[] };

type RecordRow = {
  id: number;
  pinId: number;
  pinTitle: string;
  marketUrl: string;
  source: string;
  question: string;
  outcomes: OutcomeOdds[];
  finalOutcomes: OutcomeOdds[] | null;
  volume: number | null;
  closeTime: Date | null;
  status: 'open' | 'resolved' | 'void';
  basis: 'live' | 'historical';
  utcSnapshotDateTime: Date;
  utcResolvedDateTime: Date | null;
  dateConfidence: string;
  utcStartDateTime: Date;
  originalStartDate: string | null;
};

export async function predictionReport(): Promise<PredictionReport> {
  const rows = await db.query<RecordRow>(
    `SELECT "r"."id", "r"."pinId", "p"."title" AS "pinTitle", "r"."marketUrl", "r"."source", "r"."question",
            "r"."outcomes", "r"."finalOutcomes", "r"."volume", "r"."closeTime", "r"."status", "r"."basis",
            "r"."utcSnapshotDateTime", "r"."utcResolvedDateTime",
            "p"."dateConfidence", "p"."utcStartDateTime", to_char("p"."originalStartDate", 'YYYY-MM-DD') AS "originalStartDate"
     FROM "PredictionRecord" AS "r"
       INNER JOIN "Pin" AS "p" ON "p"."id" = "r"."pinId" AND "p"."utcDeletedDateTime" IS NULL
     ORDER BY COALESCE("r"."utcResolvedDateTime", "r"."utcSnapshotDateTime") DESC, "r"."id" DESC`,
  );
  type Scored = { forecasts: ReturnType<typeof scoreMarket>; favoriteWon: boolean | null };
  const scored: Record<'live' | 'historical', Scored[]> = { live: [], historical: [] };
  const entries: PredictionEntry[] = rows.map((r) => {
    const [favorite] = r.outcomes.filter((o) => o.probability != null).sort((a, b) => b.probability! - a.probability!);
    const final = r.finalOutcomes ?? [];
    const won = r.status === 'resolved' ? favoriteWon(r.outcomes, final) : null;
    if (r.status === 'resolved') scored[r.basis].push({ forecasts: scoreMarket(r.outcomes, final), favoriteWon: won });
    return {
      id: r.id,
      pinId: r.pinId,
      pinTitle: r.pinTitle,
      question: r.question,
      source: r.source,
      marketUrl: r.marketUrl,
      status: r.status,
      basis: r.basis,
      volume: r.volume,
      snapshotAt: r.utcSnapshotDateTime.toISOString(),
      resolvedAt: r.utcResolvedDateTime?.toISOString() ?? null,
      closeTime: r.closeTime?.toISOString() ?? null,
      favorite: favorite ? { label: favorite.label, probability: favorite.probability! } : null,
      winner: r.status === 'resolved' ? (final.filter((o) => (o.probability ?? 0) >= 0.99).map((o) => o.label).join(', ') || null) : null,
      favoriteWon: won,
      pinDateConfidence: r.dateConfidence,
      pinStart: r.utcStartDateTime.toISOString(),
      pinOriginalStart: r.originalStartDate,
    };
  });
  return {
    live: summarize(scored.live),
    historical: summarize(scored.historical),
    open: entries.filter((e) => e.status === 'open').length,
    voided: entries.filter((e) => e.status === 'void').length,
    entries,
  };
}

const g = globalThis as unknown as { __chronopinPredictionRecordTimer?: ReturnType<typeof setInterval>; __chronopinPredictionRecordBusy?: boolean };

export function startPredictionRecords() {
  const setting = process.env.PREDICTION_RECORDS;
  const on = setting ? setting === '1' : process.env.NODE_ENV === 'production';
  if (!on || g.__chronopinPredictionRecordTimer) return;
  const tick = async () => {
    if (g.__chronopinPredictionRecordBusy) return;
    g.__chronopinPredictionRecordBusy = true;
    try {
      const totals = await syncAllRecords();
      if (totals.recorded || totals.settled || totals.voided) log.info('prediction records:', JSON.stringify(totals));
    } catch (err) {
      log.warn('prediction records failed:', (err as Error).message);
    } finally {
      g.__chronopinPredictionRecordBusy = false;
    }
  };
  g.__chronopinPredictionRecordTimer = setInterval(() => void tick(), CHECK_MS);
  g.__chronopinPredictionRecordTimer.unref();
}
