// Fills in reasoning on existing references found by hand, one column only -
// no delete-and-reinsert, so nothing else on the pin or its other references
// is touched.
//
//   npm run references:reasoning:apply -- --file=/tmp/batch-0-done.json
//   npm run references:reasoning:apply -- --items='[{"id":103,"reasoning":"..."}]'

import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';
import { REASONING_MAX } from '@/server/model/pinReference';

const { values: flags } = parseArgs({
  options: {
    file: { type: 'string' },
    items: { type: 'string' },
  },
});

type Item = { id: number; reasoning: string };

async function main() {
  const raw = flags.file ? readFileSync(flags.file, 'utf8') : flags.items;
  if (!raw) throw new Error('--items or --file is required');
  const items: Item[] = JSON.parse(raw);

  let updated = 0;
  let skipped = 0;
  for (const item of items) {
    const id = Number(item.id);
    const reasoning = item.reasoning?.trim().slice(0, REASONING_MAX);
    if (!Number.isInteger(id) || !reasoning) {
      console.warn(`skip: bad item ${JSON.stringify(item)}`);
      skipped++;
      continue;
    }
    // Only fills the gap - never overwrites reasoning that already exists.
    const rows = await db.query(
      `UPDATE "PinReference" SET "reasoning" = $1 WHERE "id" = $2 AND "reasoning" IS NULL RETURNING "id"`,
      [reasoning, id],
    );
    if (rows.length) {
      updated++;
    } else {
      console.warn(`skip: reference ${id} not found or already has reasoning`);
      skipped++;
    }
  }
  console.log(`updated ${updated} reference(s), skipped ${skipped}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => db.closeConnection());
