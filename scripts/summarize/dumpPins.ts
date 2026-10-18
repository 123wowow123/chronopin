// Usage: npx tsx scripts/summarize/dumpPins.ts <out.json>
// Writes every live pin's id, title, description, sourceUrl and summary.

import '../env';
import { writeFileSync } from 'node:fs';
import * as db from '@/server/db';

const out = process.argv[2];

db.query(`SELECT "id", "title", "description", "sourceUrl", "longFormSummary" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL ORDER BY "id"`)
  .then((rows) => {
    writeFileSync(out, JSON.stringify(rows, null, 2));
    console.log('Wrote', rows.length, 'pins to', out);
  })
  .catch((err) => {
    console.log('ERROR', err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
