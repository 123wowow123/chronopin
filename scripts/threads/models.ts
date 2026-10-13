// Threads existing AI-model pins by model line (src/lib/modelSeries.ts): each
// release or update answers the latest earlier pin of the same company's line
// at the same or an earlier version. Run it after adding a family to
// modelSeries.ts so the pins already stored pick it up.
//
//   npm run threads:models            list what would change
//   npm run threads:models -- --apply change it
//
// A pin with no parent is given one; a pin answering another pin of its own
// line moves to a closer one. A response to anything else stays.

import '../env';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { modelRelease } from '@/lib/modelSeries';
import { findSeriesPin } from '@/server/scrape/modelSeries';
import { descendantIds, setParent } from '@/server/scrape/prequel';

const { values: flags } = parseArgs({ options: { apply: { type: 'boolean', default: false } } });

type Row = { id: number; title: string; parentId: number | null; utcStartDateTime: Date; company: string | null };

async function run() {
  const rows = await db.query<Row>(
    `SELECT "Pin"."id", "Pin"."title", "Pin"."parentId", "Pin"."utcStartDateTime", "Company"."name" AS "company"
     FROM "Pin" LEFT JOIN "Company" ON "Company"."id" = "Pin"."companyId"
     WHERE "Pin"."utcDeletedDateTime" IS NULL ORDER BY "Pin"."utcStartDateTime", "Pin"."id"`,
  );
  const byId = new Map(rows.map((r) => [r.id, r]));
  let changed = 0;
  for (const pin of rows) {
    if (!pin.company || !modelRelease(pin.title)) continue;
    const best = await findSeriesPin(pin, await descendantIds(pin.id));
    if (!best || best.id === pin.parentId) continue;
    if (pin.parentId != null) {
      // Only a pin answering another of its own company and line moves.
      const parent = byId.get(pin.parentId);
      const line = modelRelease(pin.title)!.line;
      if (!parent || parent.company !== pin.company || modelRelease(parent.title)?.line !== line) continue;
    }
    console.log(`${pin.id} ${pin.title}: ${pin.parentId ?? 'none'} -> ${best.id} ${best.title}`);
    if (flags.apply) await setParent(pin.id, best.id);
    changed++;
  }
  console.log(`${changed} pin${changed === 1 ? '' : 's'} ${flags.apply ? 'threaded' : 'would change'}`);
  process.exit(0);
}

run();
