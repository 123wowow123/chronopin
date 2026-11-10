// A pin's "problem it solves" (PinPurpose, 0255). One row per pin.
import * as db from '../db';
import type { PinPurposeJson } from '@/lib/pinPurpose';

type Row = Omit<PinPurposeJson, 'checkedAt'> & { checkedAt: Date };
const COLS = `"problem", "solution", "beneficiaries", "sourceUrl", "checkedAt"`;

export async function purposeForPin(pinId: number): Promise<PinPurposeJson | null> {
  const [r] = await db.query<Row>(`SELECT ${COLS} FROM "PinPurpose" WHERE "pinId" = $1`, [pinId]);
  return r ? { ...r, checkedAt: new Date(r.checkedAt).toISOString() } : null;
}

export type SavePurposeInput = { problem: string; solution?: string | null; beneficiaries?: string | null; sourceUrl?: string | null };

export async function savePurpose(pinId: number, i: SavePurposeInput) {
  await db.query(
    `INSERT INTO "PinPurpose" ("pinId", "problem", "solution", "beneficiaries", "sourceUrl", "checkedAt")
     VALUES ($1,$2,$3,$4,$5, now())
     ON CONFLICT ("pinId") DO UPDATE SET "problem"=$2, "solution"=$3, "beneficiaries"=$4, "sourceUrl"=$5, "checkedAt"=now()`,
    [pinId, i.problem, i.solution ?? null, i.beneficiaries ?? null, i.sourceUrl ?? null],
  );
}

export async function deletePurpose(pinId: number) {
  await db.query(`DELETE FROM "PinPurpose" WHERE "pinId" = $1`, [pinId]);
}
