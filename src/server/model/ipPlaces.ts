import * as db from '../db';
import { locate } from '../ipLocation';

// Tables whose rows carry an "ip" and the place columns it is looked up into
// ("country", "region", "city", "latitude", "longitude", "located").
export type LocatedTable = 'ShopClick' | 'PinView' | 'AdClick';

// Places every row of the table whose address has not been looked up yet. A
// row the database cannot place is marked looked-up all the same, so it is
// not asked about again. Answers how many addresses were looked up.
export async function locateUnlocated(table: LocatedTable): Promise<number> {
  const rows = await db.query<{ ip: string }>(`SELECT DISTINCT host("ip") AS "ip" FROM "${table}" WHERE "located" IS NULL AND "ip" IS NOT NULL`);
  if (!rows.length) return 0;
  const places = await locate(rows.map((r) => r.ip));
  const found = rows.map((r) => ({ ip: r.ip, ...places.get(r.ip) }));
  await db.query(
    `UPDATE "${table}" AS "t"
     SET "country" = "f"."country", "region" = "f"."region", "city" = "f"."city",
       "latitude" = "f"."latitude", "longitude" = "f"."longitude", "located" = now()
     FROM unnest($1::inet[], $2::varchar[], $3::varchar[], $4::varchar[], $5::float8[], $6::float8[])
       AS "f" ("ip", "country", "region", "city", "latitude", "longitude")
     WHERE "t"."ip" = "f"."ip" AND "t"."located" IS NULL`,
    [
      found.map((f) => f.ip),
      found.map((f) => f.country ?? null),
      found.map((f) => f.region ?? null),
      found.map((f) => f.city ?? null),
      found.map((f) => f.latitude ?? null),
      found.map((f) => f.longitude ?? null),
    ],
  );
  return rows.length;
}
