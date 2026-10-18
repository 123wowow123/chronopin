// Push catalog corrections onto already-seeded pins. Usage: syncFixes.ts <previous-urls.json> [--remove key,key]
// previous-urls.json maps "city/slug" to the sourceUrl the pin was seeded under (only keys that changed or need syncing).
import '../env';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { syncActivityPins } from '@/server/services/activitySeed';
import * as db from '@/server/db';

const { values, positionals } = parseArgs({ allowPositionals: true, options: { remove: { type: 'string' } } });
try {
  const previous = new Map<string, string>(Object.entries(JSON.parse(await readFile(positionals[0], 'utf8'))));
  if (values.remove) {
    const urls = values.remove.split(',').map((s) => s.trim());
    const rows = await db.query(`UPDATE "Pin" SET "utcDeletedDateTime" = now() WHERE "sourceUrl" = ANY($1::text[]) AND "utcDeletedDateTime" IS NULL RETURNING "id"`, [urls]);
    console.log(`removed ${rows.length} pins`);
  }
  console.log(`updated ${await syncActivityPins([...previous.keys()], previous)} pins`);
} finally {
  await db.closeConnection();
}
