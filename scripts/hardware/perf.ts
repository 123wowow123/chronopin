// Saves the hardware performance charts and tables in perf.json to the local
// database (PinPerf, 0198), finding each pin by its sourceUrl.
//
//   npx tsx scripts/hardware/perf.ts
//
// For prod, PUT the same charts/tables to /api/pins/:id/performance as an admin.

import '../env';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as db from '@/server/db';
import { perfProblem } from '@/lib/pinPerf';
import { savePerf } from '@/server/model/pinPerf';

async function run() {
  const entries: Array<{ sourceUrl: string; charts: unknown[]; tables: unknown[] }> = JSON.parse(readFileSync(path.join(import.meta.dirname, 'perf.json'), 'utf8'));
  for (const entry of entries) {
    const parsed = perfProblem(entry);
    if (typeof parsed === 'string') throw new Error(`${entry.sourceUrl}: ${parsed}`);
    const pins = await db.query<{ id: number }>(`SELECT "id" FROM "Pin" WHERE "sourceUrl" = $1 AND "utcDeletedDateTime" IS NULL`, [entry.sourceUrl]);
    if (!pins.length) console.log(`no pin for ${entry.sourceUrl}`);
    for (const pin of pins) {
      await savePerf(pin.id, parsed.charts, parsed.tables);
      console.log(`pin ${pin.id}: ${parsed.charts.length} charts, ${parsed.tables.length} tables`);
    }
  }
}

run().then(() => process.exit(0), (error) => { console.error(error); process.exit(1); });
