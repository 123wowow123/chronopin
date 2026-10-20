// A pin's annual electricity use in GWh (PinEnergy, 0197). One row per pin.

import * as db from '../db';
import type { PinEnergyJson } from '@/lib/energy';

type Row = Omit<PinEnergyJson, 'gwh' | 'checkedAt'> & { gwh: string; checkedAt: Date };

export async function energyForPin(pinId: number): Promise<PinEnergyJson | null> {
  const [row] = await db.query<Row>(`SELECT "gwh", "basis", "sourceUrl", "note", "checkedAt" FROM "PinEnergy" WHERE "pinId" = $1`, [pinId]);
  return row ? { ...row, gwh: Number(row.gwh), checkedAt: new Date(row.checkedAt).toISOString() } : null;
}

export async function saveEnergy(pinId: number, gwh: number, { basis, sourceUrl, note }: { basis: PinEnergyJson['basis']; sourceUrl: string | null; note: string | null }) {
  await db.query(
    `INSERT INTO "PinEnergy" ("pinId", "gwh", "basis", "sourceUrl", "note", "checkedAt")
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT ("pinId") DO UPDATE SET "gwh" = $2, "basis" = $3, "sourceUrl" = $4, "note" = $5, "checkedAt" = now()`,
    [pinId, gwh, basis, sourceUrl, note],
  );
}

export async function deleteEnergy(pinId: number) {
  await db.query(`DELETE FROM "PinEnergy" WHERE "pinId" = $1`, [pinId]);
}
