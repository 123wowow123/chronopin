// A pin's electrical capacity in megawatts (PinPower, 0196). One row per pin;
// a row set by hand is never replaced by one read off the title.

import * as db from '../db';
import { titlePower, type PinPowerJson, type PowerKind } from '@/lib/power';

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

// A pin saved with a capacity in its title ("200 MW BESS", "1,124 MWac Solar")
// and no PinPower row gets a 'title' one, kind read off the title. Never
// replaces a row, so a hand reading or an earlier title one stands.
export async function saveTitlePower(pinId: number, title: string, sourceUrl: string | null) {
  const read = titlePower(title);
  if (!read) return false;
  const rows = await db.query(
    `INSERT INTO "PinPower" ("pinId", "megawatts", "kind", "source", "sourceUrl") VALUES ($1, $2, $3, 'title', $4) ON CONFLICT DO NOTHING RETURNING "pinId"`,
    [pinId, read.megawatts, read.kind, sourceUrl],
  );
  return rows.length > 0;
}
