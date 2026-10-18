// Catches pins' link wikis and summaries up (see
// src/server/services/sourceWiki.ts). Saving a pin does this for that pin;
// this covers pins from before, links that failed (a site down, no API
// credit), and summaries left stale by a failed rebuild.
//
//   npm run wiki:sync                         links with no wiki yet, failed ones with tries left,
//                                             and pins whose summary is behind its links
//   npm run wiki:sync -- --pin 42             just pin 42
//   npm run wiki:sync -- --retry-failed       failed links that are out of tries too
//   npm run wiki:sync -- --pin 42 --refetch   read pin 42's links again; rewrite wikis whose text changed
//   npm run wiki:sync -- --pin 42 --rebuild   rebuild pin 42's summary even if its links have not changed
//   npm run wiki:sync -- --all                sync every live pin's links first (the first backfill)
//   npm run wiki:sync -- --limit 20           at most 20 pins
//   npm run wiki:sync -- --dry-run            count what would run, call nothing
//
// Each new wiki is one Claude call (more for a long transcript) and each
// rebuilt summary one more. A pin that already has a summary when its links
// are first synced keeps it: its links count as already taken in.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import Source, { PinSource } from '@/server/model/source';
import { refreshPin, syncPinSources } from '@/server/services/sourceWiki';

const { values: flags } = parseArgs({
  options: {
    pin: { type: 'string' },
    limit: { type: 'string' },
    all: { type: 'boolean' },
    'retry-failed': { type: 'boolean' },
    refetch: { type: 'boolean' },
    rebuild: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
  },
});

async function pinIds(limit: number): Promise<number[]> {
  if (flags.pin) return [Number(flags.pin)];
  if (flags.all) {
    const rows = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL ORDER BY "id"`);
    console.log(`syncing links of ${rows.length} pin(s)`);
    for (const { id } of rows) await syncPinSources(id);
  }
  // Pins citing a link that needs a wiki, then pins whose summary is behind.
  const sourceIds = await Source.needingWiki({ limit: 100_000, force: flags['retry-failed'] });
  const citing = sourceIds.length
    ? await db.query<{ pinId: number }>(
        `SELECT DISTINCT "PinSource"."pinId" FROM "PinSource"
           JOIN "Pin" ON "Pin"."id" = "PinSource"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
         WHERE "PinSource"."sourceId" = ANY($1::integer[]) AND "PinSource"."utcRemovedDateTime" IS NULL
         ORDER BY 1`,
        [sourceIds],
      )
    : [];
  const stale = await PinSource.staleSummaryPinIds(100_000);
  return [...new Set([...citing.map((r) => r.pinId), ...stale])].slice(0, limit);
}

async function run() {
  const limit = flags.limit ? Number(flags.limit) : 100_000;
  const ids = await pinIds(limit);
  console.log(`${ids.length} pin(s) to refresh`);
  if (flags['dry-run']) return;

  const totals: Record<string, number> = {};
  let rebuilt = 0;
  for (const id of ids) {
    const result = await refreshPin(id, { retryFailed: flags['retry-failed'], refetch: flags.refetch, rebuild: flags.rebuild });
    const outcomes = Object.values(result.ingested);
    outcomes.forEach((o) => (totals[o] = (totals[o] ?? 0) + 1));
    if (result.rebuilt) rebuilt++;
    console.log(`pin ${id}: ${outcomes.length ? outcomes.join(', ') : 'no links to write up'}${result.rebuilt ? '; summary rebuilt' : ''}`);
  }
  console.log(`links: ${JSON.stringify(totals)}; summaries rebuilt: ${rebuilt}`);
}

run()
  .catch((err) => {
    console.log('wiki:sync failed:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
