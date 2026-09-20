// Refreshes the dollars traded on the prediction markets pins cite
// (Pin.marketVolume, schema 0053), which the timeline's bag weight reads
// (src/lib/bagSample.ts).
//
// New and edited pins get their figure on save (services/pinMarketVolume.ts)
// and an open pin's keeps up with the odds feed; this is for the rest - a
// market that has kept trading since anyone last looked at its pin.
//
//   npm run markets:volume                  list what would change
//   npm run markets:volume -- --apply       change it
//   npm run markets:volume -- --ids 1951,1967 --apply
//   npm run markets:volume -- --stale 12h --apply    only figures older than that
//
// Then `npm run backup:data` to keep it in the seed data.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { syncPinMarketVolume } from '@/server/services/pinMarketVolume';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    // Only pins whose figure is older than this (e.g. 6h, 2d); every pin by default.
    stale: { type: 'string' },
    // Between pins, to go easy on the exchanges' keyless rate limits.
    pause: { type: 'string', default: '400' },
  },
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// "90m", "6h", "2d" as milliseconds.
function span(text: string): number {
  const match = /^(\d+(?:\.\d+)?)([mhd])$/.exec(text.trim());
  if (!match) throw new Error(`--stale wants a span like 6h or 2d, not "${text}"`);
  return Number(match[1]) * { m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2] as 'm' | 'h' | 'd'];
}

const usd = (value: number | null) => (value == null ? 'none' : `$${Math.round(value).toLocaleString('en-US')}`);

async function run() {
  const ids = flags.ids?.split(',').map(Number).filter(Number.isInteger);
  const staleBefore = flags.stale ? new Date(Date.now() - span(flags.stale)) : null;
  // Pins whose source or references link an exchange; the parse in
  // pinMarketRefs has the last word on what is really a market link.
  const rows = await db.query<{ id: number; title: string }>(
    `SELECT "p"."id", "p"."title"
     FROM "Pin" AS "p"
     WHERE "p"."utcDeletedDateTime" IS NULL
       AND (
         "p"."sourceUrl" ~* 'https?://(www\\.)?(kalshi\\.com|polymarket\\.(com|us))/'
         OR EXISTS (SELECT 1 FROM "PinReference" AS "r"
                    WHERE "r"."pinId" = "p"."id" AND "r"."url" ~* 'https?://(www\\.)?(kalshi\\.com|polymarket\\.(com|us))/')
       )
       ${ids?.length ? 'AND "p"."id" = ANY($1::int[])' : ''}
       ${staleBefore ? `AND ("p"."marketVolumeAt" IS NULL OR "p"."marketVolumeAt" < $${ids?.length ? 2 : 1})` : ''}
     ORDER BY "p"."id"`,
    [...(ids?.length ? [ids] : []), ...(staleBefore ? [staleBefore] : [])],
  );
  console.log(`${flags.apply ? 'Refreshing' : 'Dry run over'} ${rows.length} pins that cite a market`);
  let changed = 0;
  let unread = 0;

  for (const row of rows) {
    let sync;
    try {
      sync = await syncPinMarketVolume(row.id, { apply: flags.apply });
    } catch (err) {
      console.log(`${row.id} ${row.title}\n    failed: ${(err as Error).message}`);
      continue;
    }
    if (!sync) {
      // No market the exchanges would answer for: the old figure stands.
      unread++;
      continue;
    }
    changed++;
    console.log(`${row.id} ${row.title}\n    ${sync.markets} market(s): ${usd(sync.before)} -> ${usd(sync.volume)}`);
    await sleep(Number(flags.pause));
  }
  console.log(`${flags.apply ? 'Wrote' : 'Would write'} ${changed} figures; ${unread} pins the exchanges did not answer for`);
}

run()
  .catch((err) => {
    console.log('Market volume err:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
