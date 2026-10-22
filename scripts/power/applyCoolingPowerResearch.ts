// Applies the verified cooling / power-source research (merged lane output,
// see docs/datacenter-cooling-power-research-2026-10-21.json) to the local
// PinDatacenter rows. Only fields whose cited page text backed the value
// (status "ok") and that are not on the hold list are written.
//
// Usage:
//   npx tsx scripts/power/applyCoolingPowerResearch.ts <applied.json> --dry
//   npx tsx scripts/power/applyCoolingPowerResearch.ts <applied.json>
import '../env';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as db from '@/server/db';

const { values: flags, positionals } = parseArgs({ options: { dry: { type: 'boolean', default: false } }, allowPositionals: true });
type Applied = { id: number; field: 'cooling' | 'powerSource'; value: string };

async function main() {
  const applied: Applied[] = JSON.parse(readFileSync(positionals[0], 'utf8'));
  let written = 0;
  for (const { id, field, value } of applied) {
    if (field !== 'cooling' && field !== 'powerSource') continue;
    const [row] = await db.query<{ v: string | null }>(`SELECT "${field}" AS v FROM "PinDatacenter" WHERE "pinId" = $1`, [id]);
    if (!row || row.v === value) continue;
    written++;
    if (!flags.dry) await db.query(`UPDATE "PinDatacenter" SET "${field}" = $2 WHERE "pinId" = $1`, [id, value]);
  }
  console.log(`${flags.dry ? 'Would write' : 'Wrote'} ${written} of ${applied.length} fields`);
  process.exit(0);
}

main();
