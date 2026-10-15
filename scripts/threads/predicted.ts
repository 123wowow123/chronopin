// Threads existing predicted pins to their parent thread: each predicted pin
// answers an earlier event in its story, series, flight test, or tournament.
//
//   npm run threads:predicted            list what would change
//   npm run threads:predicted -- --apply change it
//   npm run threads:predicted -- --ids 1992 --apply
//
// Writes "parentId" alone, and invalidates affected cache entries.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { applyThreadParent, findThreadCandidates, rethreadAllDuplicateGroups } from '@/server/jobs/threadPredicted';

const { values: flags } = parseArgs({
  options: {
    apply: { type: 'boolean', default: false },
    ids: { type: 'string' },
    all: { type: 'boolean', default: false }, // include pins that already have a parentId
  },
});

type Row = {
  id: number;
  title: string;
  parentId: number | null;
  utcStartDateTime: Date;
  company: string | null;
  sourceUrl: string | null;
};

async function run() {
  const only = new Set(flags.ids?.split(',').map(Number).filter(Number.isInteger));
  const rows = await db.query<Row>(
    `SELECT p."id", p."title", p."parentId", p."utcStartDateTime", p."sourceUrl", "Company"."name" AS "company"
     FROM "Pin" p
     LEFT JOIN "Company" ON "Company"."id" = p."companyId"
     WHERE p."utcDeletedDateTime" IS NULL
       AND (
         EXISTS (SELECT 1 FROM "PinTag" pt WHERE pt."pinId" = p."id" AND lower(pt."name") = 'predicted')
         OR (p."dateConfidence" = 'estimated' AND (
           EXISTS (SELECT 1 FROM "PinReference" pr WHERE pr."pinId" = p."id" AND pr."url" ~* '(kalshi\\.com|polymarket\\.(com|us))/')
           OR p."sourceUrl" ~* '(kalshi\\.com|polymarket\\.(com|us))/'
         ))
       )
     ORDER BY p."utcStartDateTime", p."id"`,
  );

  console.log('Checking confirmed duplicate groups for thread conflicts...');
  const duplicateFixes = await rethreadAllDuplicateGroups({ apply: flags.apply });
  if (duplicateFixes.length) {
    console.log(`${flags.apply ? 'Rethreaded' : 'Would rethread'} ${duplicateFixes.length} duplicate group(s):`);
    for (const fix of duplicateFixes) {
      console.log(
        `  Canonical ${fix.canonicalId}: detached [${fix.detached.join(', ')}], reparented children [${fix.reparented.map((r) => `${r.childId}->${r.to}`).join(', ')}]`,
      );
    }
  } else {
    console.log('No duplicate group thread conflicts.');
  }

  const pins = rows.filter((p) => (!only.size || only.has(p.id)) && (flags.all || p.parentId == null));
  console.log(`${flags.apply ? 'Threading' : 'Dry run over'} ${pins.length} predicted pin(s)...`);

  let changed = 0;
  for (const pin of pins) {
    const candidates = await findThreadCandidates(pin);
    if (!candidates.length) continue;
    const best = candidates[0];
    if (best.id === pin.parentId) continue;

    console.log(`${pin.id} ${pin.title}: ${pin.parentId ?? 'none'} -> ${best.id} ${best.title} [${best.reason}]`);
    if (flags.apply) {
      await applyThreadParent(pin.id, best.id);
    }
    changed++;
  }

  console.log(`${changed} pin${changed === 1 ? '' : 's'} ${flags.apply ? 'threaded' : 'would change'}`);
  process.exit(0);
}

run()
  .catch((err) => {
    console.error('Predicted thread error:', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
