// A hardware pin's published performance charts and tables (PinPerf, 0198).
// One row per pin.

import * as db from '../db';
import type { PerfChart, PerfTable, PinPerfJson } from '@/lib/pinPerf';

type Row = Omit<PinPerfJson, 'checkedAt'> & { checkedAt: Date };

export async function perfForPin(pinId: number): Promise<PinPerfJson | null> {
  const [row] = await db.query<Row>(`SELECT "charts", "tables", "checkedAt" FROM "PinPerf" WHERE "pinId" = $1`, [pinId]);
  return row ? { ...row, checkedAt: new Date(row.checkedAt).toISOString() } : null;
}

export async function savePerf(pinId: number, charts: PerfChart[], tables: PerfTable[]) {
  await db.query(
    `INSERT INTO "PinPerf" ("pinId", "charts", "tables", "checkedAt")
     VALUES ($1, $2::jsonb, $3::jsonb, now())
     ON CONFLICT ("pinId") DO UPDATE SET "charts" = EXCLUDED."charts", "tables" = EXCLUDED."tables", "checkedAt" = now()`,
    [pinId, JSON.stringify(charts), JSON.stringify(tables)],
  );
}

export async function deletePerf(pinId: number) {
  await db.query(`DELETE FROM "PinPerf" WHERE "pinId" = $1`, [pinId]);
}
