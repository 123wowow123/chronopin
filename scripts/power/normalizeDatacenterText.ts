// Spells out the tracker's bare cooling and power-source words on every local
// PinDatacenter row ("closed · water" -> "Closed-loop water cooling", "gas" ->
// "Natural gas", "BTM: " -> "Behind-the-meter (generation not named)") and
// turns blank ones into null, so the pin page's cooling:/powersource: links
// have words to match. Values it does not recognise are left alone.
//
// Usage:
//   npx tsx scripts/power/normalizeDatacenterText.ts --dry
//   npx tsx scripts/power/normalizeDatacenterText.ts
import '../env';
import { parseArgs } from 'node:util';
import { normalizeCooling, normalizePowerSource } from '@/lib/datacenter';
import * as db from '@/server/db';

const { values: flags } = parseArgs({ options: { dry: { type: 'boolean', default: false } } });

async function main() {
  const rows = await db.query<{ pinId: number; cooling: string | null; powerSource: string | null }>(
    `SELECT "pinId", "cooling", "powerSource" FROM "PinDatacenter"`,
  );
  let changed = 0;
  for (const row of rows) {
    const cooling = normalizeCooling(row.cooling);
    const powerSource = normalizePowerSource(row.powerSource);
    if (cooling === row.cooling && powerSource === row.powerSource) continue;
    changed++;
    if (changed <= 15) console.log(row.pinId, JSON.stringify([row.cooling, row.powerSource]), '->', JSON.stringify([cooling, powerSource]));
    if (!flags.dry) await db.query(`UPDATE "PinDatacenter" SET "cooling" = $2, "powerSource" = $3 WHERE "pinId" = $1`, [row.pinId, cooling, powerSource]);
  }
  console.log(`${flags.dry ? 'Would change' : 'Changed'} ${changed} of ${rows.length} rows`);
  process.exit(0);
}

main();
