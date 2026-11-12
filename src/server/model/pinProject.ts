// A pin's building-project quantities (PinProject, 0249). One row per pin.
import * as db from '../db';
import type { PinProjectJson, ProjectBasis } from '@/lib/projectSpecs';

type Row = Omit<PinProjectJson, 'sqft' | 'acres' | 'checkedAt'> & { sqft: string | null; acres: string | null; checkedAt: Date };
const num = (v: string | null) => (v == null ? null : Number(v));
const COLS = `"units", "affordableUnits", "rooms", "seats", "beds", "stories", "sqft", "acres", "parking", "parkAcres", "source", "basis", "sourceUrl", "note", "checkedAt"`;

export async function projectForPin(pinId: number): Promise<PinProjectJson | null> {
  const [r] = await db.query<Row>(`SELECT ${COLS} FROM "PinProject" WHERE "pinId" = $1`, [pinId]);
  if (!r) return null;
  return { ...r, sqft: num(r.sqft), acres: num(r.acres), checkedAt: new Date(r.checkedAt).toISOString() };
}

export type SaveProjectInput = {
  units?: number | null; affordableUnits?: number | null; rooms?: number | null; seats?: number | null; beds?: number | null;
  stories?: number | null; sqft?: number | null; acres?: number | null; parking?: number | null; parkAcres?: number | null;
  basis?: ProjectBasis | null; sourceUrl?: string | null; note?: string | null;
};

// A hand write replaces the whole row; a title write (backfill) only fills a pin that has no hand row.
export async function saveProject(pinId: number, i: SaveProjectInput, source: 'hand' | 'title' = 'hand') {
  const int = (v?: number | null) => (v != null ? Math.round(v) : null);
  await db.query(
    `INSERT INTO "PinProject" ("pinId", "units", "affordableUnits", "rooms", "seats", "beds", "stories", "sqft", "acres", "parking", "parkAcres", "source", "basis", "sourceUrl", "note", "checkedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())
     ON CONFLICT ("pinId") DO UPDATE SET "units"=$2, "affordableUnits"=$3, "rooms"=$4, "seats"=$5, "beds"=$6, "stories"=$7, "sqft"=$8,
       "acres"=$9, "parking"=$10, "parkAcres"=$11, "source"=$12, "basis"=$13, "sourceUrl"=$14, "note"=$15, "checkedAt"=now()
     WHERE $12 = 'hand' OR "PinProject"."source" = 'title'`,
    [pinId, int(i.units), int(i.affordableUnits), int(i.rooms), int(i.seats), int(i.beds), int(i.stories), int(i.sqft), i.acres ?? null, int(i.parking), i.parkAcres ?? null,
      source, i.basis ?? null, i.sourceUrl ?? null, i.note ?? null],
  );
}

export async function deleteProject(pinId: number) {
  await db.query(`DELETE FROM "PinProject" WHERE "pinId" = $1`, [pinId]);
}
