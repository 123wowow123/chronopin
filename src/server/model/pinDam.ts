// A pin's dam figures (PinDam, 0254) and the /dams aggregate. One row per pin.
import * as db from '../db';
import { pinPath } from '@/lib/seo';
import type { DamBasis, DamRow, DamScope, DamType, PinDamJson } from '@/lib/damSpecs';

type Row = Omit<PinDamJson, 'heightFt' | 'crestLengthFt' | 'capacityMw' | 'storageAcreFt' | 'addedStorageAcreFt' | 'checkedAt'> & {
  heightFt: string | null; crestLengthFt: string | null; capacityMw: string | null; storageAcreFt: string | null; addedStorageAcreFt: string | null; checkedAt: Date;
};
const num = (v: string | null) => (v == null ? null : Number(v));
const COLS = `"heightFt", "crestLengthFt", "storageAcreFt", "addedStorageAcreFt", "capacityMw", "damType", "river", "owner", "state", "scope", "basis", "sourceUrl", "note", "checkedAt"`;

export async function damForPin(pinId: number): Promise<PinDamJson | null> {
  const [r] = await db.query<Row>(`SELECT ${COLS} FROM "PinDam" WHERE "pinId" = $1`, [pinId]);
  if (!r) return null;
  return {
    ...r, heightFt: num(r.heightFt), crestLengthFt: num(r.crestLengthFt), capacityMw: num(r.capacityMw),
    storageAcreFt: num(r.storageAcreFt), addedStorageAcreFt: num(r.addedStorageAcreFt), checkedAt: new Date(r.checkedAt).toISOString(),
  };
}

export type SaveDamInput = {
  heightFt?: number | null; crestLengthFt?: number | null; storageAcreFt?: number | null; addedStorageAcreFt?: number | null; capacityMw?: number | null;
  damType?: DamType | null; river?: string | null; owner?: string | null; state?: string | null; scope?: DamScope | null;
  basis?: DamBasis | null; sourceUrl?: string | null; note?: string | null;
};

export async function saveDam(pinId: number, i: SaveDamInput) {
  const int = (v?: number | null) => (v != null ? Math.round(v) : null);
  await db.query(
    `INSERT INTO "PinDam" ("pinId", "heightFt", "crestLengthFt", "storageAcreFt", "addedStorageAcreFt", "capacityMw", "damType", "river", "owner", "state", "scope", "basis", "sourceUrl", "note", "checkedAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, now())
     ON CONFLICT ("pinId") DO UPDATE SET "heightFt"=$2, "crestLengthFt"=$3, "storageAcreFt"=$4, "addedStorageAcreFt"=$5, "capacityMw"=$6, "damType"=$7,
       "river"=$8, "owner"=$9, "state"=$10, "scope"=$11, "basis"=$12, "sourceUrl"=$13, "note"=$14, "checkedAt"=now()`,
    [pinId, i.heightFt ?? null, i.crestLengthFt ?? null, int(i.storageAcreFt), int(i.addedStorageAcreFt), i.capacityMw ?? null, i.damType ?? null,
      i.river ?? null, i.owner ?? null, i.state ?? null, i.scope ?? null, i.basis ?? null, i.sourceUrl ?? null, i.note ?? null],
  );
}

export async function deleteDam(pinId: number) {
  await db.query(`DELETE FROM "PinDam" WHERE "pinId" = $1`, [pinId]);
}

// Every live pin with a dam row, with its status tag, price and map point.
export async function damRows(): Promise<DamRow[]> {
  const rows = await db.query<Omit<DamRow, 'href' | 'heightFt' | 'lat' | 'lon'> & { heightFt: string | null; lat: number | null; lon: number | null; originalTitle: string | null }>(
    `SELECT p.id, p.title, d."state", d."scope", d."heightFt", d."storageAcreFt"::float8 AS "storageAcreFt", d."addedStorageAcreFt"::float8 AS "addedStorageAcreFt",
            d."capacityMw"::float8 AS "capacityMw", p.price::float8 AS price, p."priceCurrency",
            (SELECT t.name::text FROM "PinTag" t WHERE t."pinId" = p.id AND t.name IN ('Proposed', 'In Progress', 'Completed', 'Withdrawn') LIMIT 1) AS status,
            ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lon,
            p."utcStartDateTime"::text AS start, p."utcEndDateTime"::text AS "end"
     FROM "PinDam" d JOIN "Pin" p ON p.id = d."pinId"
     WHERE p."utcDeletedDateTime" IS NULL
     ORDER BY p."utcStartDateTime", p.id`,
  );
  return rows.map((r) => ({ ...r, heightFt: num(r.heightFt), href: pinPath({ id: r.id, title: r.title }) }));
}
