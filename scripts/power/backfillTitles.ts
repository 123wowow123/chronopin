// Adds a PinPower row (source 'title') for each live pin whose title states a
// capacity ("500 MW", "1,124 MWac", "2.5 GWdc") but has none: the 0196 backfill
// matched only a bare MW/GW, and pins added since have no row. Reads the kind
// off the title as 0200/0201 do (a hybrid "Solar & Storage" is generation).
// A title it cannot classify is listed, not guessed. The reading is
// titlePower() in src/lib/power.ts, which pin saves also use.
//
//   npx tsx scripts/power/backfillTitles.ts --dry     list what would be added
//   npx tsx scripts/power/backfillTitles.ts           add the rows locally
//   npx tsx scripts/power/powerKindProd.ts            then push them to prod

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { titlePower, type PowerKind } from '@/lib/power';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false } } });

async function run() {
  const rows = await db.query<{ id: number; title: string; sourceUrl: string | null }>(
    `SELECT p."id", p."title", p."sourceUrl" FROM "Pin" p
     WHERE p."utcDeletedDateTime" IS NULL AND NOT EXISTS (SELECT 1 FROM "PinPower" w WHERE w."pinId" = p."id")
       AND p."title" ~* '\\d\\s?(MW|GW|megawatt|gigawatt)'
     ORDER BY p."id"`,
  );
  const add: { id: number; mw: number; kind: PowerKind; sourceUrl: string | null }[] = [];
  const skipped: string[] = [];
  for (const row of rows) {
    const read = titlePower(row.title);
    if (!read) {
      skipped.push(`${row.id} ${row.title.slice(0, 110)}`);
      continue;
    }
    add.push({ id: row.id, mw: read.megawatts, kind: read.kind, sourceUrl: row.sourceUrl });
  }
  const by = (k: PowerKind) => add.filter((a) => a.kind === k).length;
  if (process.env.SHOW) for (const a of add) if (a.kind === process.env.SHOW) console.log(a.kind, a.mw, rows.find((r) => r.id === a.id)!.title.slice(0, 120));
  console.log(`${rows.length} candidates: ${add.length} to add (generation ${by('generation')}, usage ${by('usage')}, storage ${by('storage')}), ${skipped.length} skipped`);
  if (flags.dry) {
    skipped.forEach((s) => console.log('skip', s));
    return;
  }
  for (const a of add) {
    await db.query(
      `INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl", "note") VALUES ($1, $2, $3, 'title', $4, NULL) ON CONFLICT DO NOTHING`,
      [a.id, a.mw, a.kind, a.sourceUrl],
    );
  }
  console.log('added');
}
run().then(() => process.exit(0));
