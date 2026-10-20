// A pin's electrical capacity in megawatts (PinPower, 0196). One row per pin;
// a row set by hand is never replaced by one read off the title.

import * as db from '../db';
import type { PinPowerJson, PowerKind } from '@/lib/power';

type Row = Omit<PinPowerJson, 'megawatts' | 'checkedAt'> & { megawatts: string; checkedAt: Date };

export async function powerForPin(pinId: number): Promise<PinPowerJson | null> {
  const [row] = await db.query<Row>(`SELECT "megawatts", "kind", "source", "sourceUrl", "note", "checkedAt" FROM "PinPower" WHERE "pinId" = $1`, [pinId]);
  return row ? { ...row, megawatts: Number(row.megawatts), checkedAt: new Date(row.checkedAt).toISOString() } : null;
}

// Returns false when a hand reading already stands and this one is a title one.
export async function savePower(pinId: number, megawatts: number, { kind, source, sourceUrl, note }: { kind: PowerKind; source: 'title' | 'hand'; sourceUrl: string | null; note: string | null }) {
  const rows = await db.query(
    `INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl", "note", "checkedAt")
     VALUES ($1, $2, $6, $3, $4, $5, now())
     ON CONFLICT ("pinId") DO UPDATE SET "megawatts" = $2, "kind" = $6, "source" = $3, "sourceUrl" = $4, "note" = $5, "checkedAt" = now()
     WHERE "PinPower"."source" <> 'hand' OR $3 = 'hand'
     RETURNING "pinId"`,
    [pinId, megawatts, source, sourceUrl, note, kind],
  );
  return rows.length > 0;
}

export async function deletePower(pinId: number) {
  await db.query(`DELETE FROM "PinPower" WHERE "pinId" = $1`, [pinId]);
}
