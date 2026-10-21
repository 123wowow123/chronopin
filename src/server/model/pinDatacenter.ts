// A pin's data-centre and facility metrics (PinDatacenter, 0202). One row per pin.

import * as db from '../db';
import type { PinDatacenterJson, WaterBasis } from '@/lib/datacenter';

type Row = {
  waterGallonsPerDay: string | null;
  waterBasis: WaterBasis | null;
  chips: string | null;
  chipModel: string | null;
  h100Equivalents: string | null;
  acres: string | null;
  sqft: string | null;
  buildings: number | null;
  generators: number | null;
  cooling: string | null;
  powerSource: string | null;
  sourceUrl: string | null;
  note: string | null;
  checkedAt: Date;
};

const toNum = (v: string | number | null | undefined): number | null =>
  v == null ? null : Number(v);

export async function datacenterForPin(pinId: number): Promise<PinDatacenterJson | null> {
  const [row] = await db.query<Row>(
    `SELECT "waterGallonsPerDay", "waterBasis", "chips", "chipModel", "h100Equivalents",
            "acres", "sqft", "buildings", "generators", "cooling", "powerSource",
            "sourceUrl", "note", "checkedAt"
     FROM "PinDatacenter" WHERE "pinId" = $1`,
    [pinId],
  );
  if (!row) return null;
  return {
    waterGallonsPerDay: toNum(row.waterGallonsPerDay),
    waterBasis: row.waterBasis ?? null,
    chips: toNum(row.chips),
    chipModel: row.chipModel ?? null,
    h100Equivalents: toNum(row.h100Equivalents),
    acres: toNum(row.acres),
    sqft: toNum(row.sqft),
    buildings: row.buildings ?? null,
    generators: row.generators ?? null,
    cooling: row.cooling ?? null,
    powerSource: row.powerSource ?? null,
    sourceUrl: row.sourceUrl ?? null,
    note: row.note ?? null,
    checkedAt: new Date(row.checkedAt).toISOString(),
  };
}

export type SaveDatacenterInput = {
  waterGallonsPerDay?: number | null;
  waterBasis?: WaterBasis | null;
  chips?: number | null;
  chipModel?: string | null;
  h100Equivalents?: number | null;
  acres?: number | null;
  sqft?: number | null;
  buildings?: number | null;
  generators?: number | null;
  cooling?: string | null;
  powerSource?: string | null;
  sourceUrl?: string | null;
  note?: string | null;
};

export async function saveDatacenter(pinId: number, input: SaveDatacenterInput) {
  await db.query(
    `INSERT INTO "PinDatacenter" (
       "pinId", "waterGallonsPerDay", "waterBasis", "chips", "chipModel", "h100Equivalents",
       "acres", "sqft", "buildings", "generators", "cooling", "powerSource",
       "sourceUrl", "note", "checkedAt"
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, now())
     ON CONFLICT ("pinId") DO UPDATE SET
       "waterGallonsPerDay" = COALESCE($2, "PinDatacenter"."waterGallonsPerDay"),
       "waterBasis" = COALESCE($3, "PinDatacenter"."waterBasis"),
       "chips" = COALESCE($4, "PinDatacenter"."chips"),
       "chipModel" = COALESCE($5, "PinDatacenter"."chipModel"),
       "h100Equivalents" = COALESCE($6, "PinDatacenter"."h100Equivalents"),
       "acres" = COALESCE($7, "PinDatacenter"."acres"),
       "sqft" = COALESCE($8, "PinDatacenter"."sqft"),
       "buildings" = COALESCE($9, "PinDatacenter"."buildings"),
       "generators" = COALESCE($10, "PinDatacenter"."generators"),
       "cooling" = COALESCE($11, "PinDatacenter"."cooling"),
       "powerSource" = COALESCE($12, "PinDatacenter"."powerSource"),
       "sourceUrl" = COALESCE($13, "PinDatacenter"."sourceUrl"),
       "note" = COALESCE($14, "PinDatacenter"."note"),
       "checkedAt" = now()`,
    [
      pinId,
      input.waterGallonsPerDay ?? null,
      input.waterBasis ?? null,
      input.chips != null ? Math.round(input.chips) : null,
      input.chipModel ?? null,
      input.h100Equivalents ?? null,
      input.acres ?? null,
      input.sqft != null ? Math.round(input.sqft) : null,
      input.buildings != null ? Math.round(input.buildings) : null,
      input.generators != null ? Math.round(input.generators) : null,
      input.cooling ?? null,
      input.powerSource ?? null,
      input.sourceUrl ?? null,
      input.note ?? null,
    ],
  );
}

export async function deleteDatacenter(pinId: number) {
  await db.query(`DELETE FROM "PinDatacenter" WHERE "pinId" = $1`, [pinId]);
}

