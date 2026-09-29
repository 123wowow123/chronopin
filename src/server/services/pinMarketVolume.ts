// How much money is on the prediction markets a pin cites, kept on the pin as
// "marketVolume" (schema 0053). The pin page shows each market's own figure
// live; the stored one is for everything that cannot wait on the exchanges -
// above all the timeline's bag weight (src/lib/bagSample.ts), which picks a
// crowded day's cards from a page of pin rows.
//
// It is written from two places, never by an author:
//
//   1. after every save and edit (events.ts), so a scraped market pin arrives
//      with its volume and an edited one has it re-read;
//   2. as the odds feed reads a pin anyone is looking at (liveFeed.ts), which
//      costs no extra call - markets that keep trading drift upwards between
//      edits.
//
// `npm run markets:volume` refreshes the rest.

import { pinMarketRefs, totalMarketVolume, type MarketOdds } from '@/lib/predictionMarkets';
import * as db from '../db';
import { oddsFor } from '../predictionMarkets';
import log from '../util/log';

// A figure this fresh is left alone by the odds feed, and a move smaller than
// this is not worth a write: volume only climbs, and on a busy market it
// climbs constantly.
const RECORD_EVERY_MS = 60 * 60_000;
const RECORD_MOVE = 0.02;

export type MarketVolumeSync = { volume: number | null; before: number | null; markets: number };

type PinLinks = { id: number; sourceUrl: string | null; marketVolume: number | null; references: { url: string | null }[] };

async function pinLinks(pinId: number): Promise<PinLinks | null> {
  const [pin] = await db.query<PinLinks>(
    `SELECT "p"."id", "p"."sourceUrl", "p"."marketVolume",
            COALESCE((SELECT json_agg(json_build_object('url', "r"."url"))
                      FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id"), '[]'::json) AS "references"
     FROM "Pin" AS "p"
     WHERE "p"."id" = $1 AND "p"."utcDeletedDateTime" IS NULL`,
    [pinId],
  );
  return pin ?? null;
}

async function store(pinId: number, volume: number | null) {
  await db.query(`UPDATE "Pin" SET "marketVolume" = $2, "marketVolumeAt" = now() WHERE "id" = $1`, [pinId, volume]);
}

// Re-reads the pin's markets and stores what they have traded. Undefined when
// the pin links no market at all (nothing to store, and nothing to clear).
// A market the exchange will not answer for counts as nothing rather than
// failing the sync, so one dead link among several still leaves a figure.
export async function syncPinMarketVolume(pinId: number, { apply = true } = {}): Promise<MarketVolumeSync | undefined> {
  const pin = await pinLinks(pinId);
  if (!pin) return undefined;
  const refs = pinMarketRefs(pin);
  if (!refs.length) {
    // A pin whose market links have gone gives its figure back.
    if (pin.marketVolume != null && apply) await store(pinId, null);
    return pin.marketVolume == null ? undefined : { volume: null, before: pin.marketVolume, markets: 0 };
  }

  const results = await Promise.allSettled(refs.map(oddsFor));
  const odds = results.flatMap((result) => {
    if (result.status === 'rejected') {
      log.warn(`odds read for pin ${pinId} failed:`, (result.reason as Error)?.message);
      return [];
    }
    return result.value ? [result.value] : [];
  });
  if (!odds.length) return undefined;

  const volume = totalMarketVolume(odds);
  if (apply) await store(pinId, volume);
  return { volume, before: pin.marketVolume, markets: odds.length };
}

// The last figure written for a pin, so the odds feed can keep quiet.
const recorded: Map<number, { volume: number; at: number }> = ((globalThis as any).__chronopinMarketVolumeWrites ??= new Map());

// The odds a viewer is already being sent, stored as the pin's volume. Cheap
// on purpose: no exchange call of its own, no write unless the figure moved,
// and no cache invalidation - a rendered page's pill may be an hour behind the
// exchange, which the page's own live odds correct in front of the reader,
// and expiring every market pin's page hourly would cost far more than that.
export function recordMarketVolume(pinId: number, markets: MarketOdds[]): void {
  if (!markets.length) return;
  const volume = totalMarketVolume(markets);
  if (!volume) return;
  const last = recorded.get(pinId);
  const now = Date.now();
  if (last && now - last.at < RECORD_EVERY_MS && Math.abs(volume - last.volume) <= last.volume * RECORD_MOVE) return;
  recorded.set(pinId, { volume, at: now });
  store(pinId, volume).catch((err) => {
    recorded.delete(pinId);
    log.warn(`storing market volume for pin ${pinId} failed:`, (err as Error).message);
  });
}
