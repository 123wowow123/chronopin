import * as db from '../db';
import type { ShopClickRow } from '@/lib/shopping';
import { locateUnlocated } from './ipPlaces';
import PinView from './pinView';

export type ShopClickInput = {
  pinId: number;
  store: string;
  url: string;
  search: boolean;
  price: number | null;
  currency: string | null;
  userId: number | null;
  ip: string | null;
};

// The same person clicking the same button again this soon is one click.
const REPEAT_SECONDS = 30;
// The page reads at most this many, newest first.
const LIST_LIMIT = 20000;

// Buy button clicks on product pins (0086).
export default class ShopClick {
  // Nothing is recorded for a pin that does not exist or was deleted, or for
  // a repeat of the same click within REPEAT_SECONDS. Answers whether it was.
  static async record(click: ShopClickInput): Promise<boolean> {
    const rows = await db.query(
      `INSERT INTO "ShopClick" ("pinId", "store", "url", "search", "price", "currency", "userId", "ip")
       SELECT "p"."id", $2::varchar, $3::text, $4::boolean, $5::numeric, $6::varchar, $7::integer, $8::inet
       FROM "Pin" AS "p"
       WHERE "p"."id" = $1::integer AND "p"."utcDeletedDateTime" IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM "ShopClick" AS "c"
           WHERE "c"."pinId" = $1::integer AND "c"."store" = $2::varchar
             AND ("c"."userId" = $7::integer OR ($7::integer IS NULL AND "c"."userId" IS NULL AND "c"."ip" = $8::inet))
             AND "c"."utcCreatedDateTime" > now() - make_interval(secs => $9::integer)
         )
       RETURNING "id"`,
      [click.pinId, click.store, click.url, click.search, click.price, click.currency, click.userId, click.ip, REPEAT_SECONDS],
    );
    return rows.length > 0;
  }

  // Places every click whose address has not been looked up yet.
  static locateUnlocated(): Promise<number> {
    return locateUnlocated('ShopClick');
  }

  // Every click, newest first, with its pin's title and picture and the
  // clicker's user name.
  static async list(): Promise<ShopClickRow[]> {
    const rows = await db.query<Omit<ShopClickRow, 'thumbName' | 'originalUrl'>>(
      `SELECT "c"."id", to_char("c"."utcCreatedDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "at",
         "c"."pinId", "p"."title", "c"."store", "c"."search", "c"."price"::float8 AS "price", "c"."currency",
         "c"."userId", "u"."userName", host("c"."ip") AS "ip",
         "c"."country", "c"."region", "c"."city", "c"."latitude", "c"."longitude"
       FROM "ShopClick" AS "c"
         LEFT JOIN "Pin" AS "p" ON "p"."id" = "c"."pinId"
         LEFT JOIN "User" AS "u" ON "u"."id" = "c"."userId"
       ORDER BY "c"."utcCreatedDateTime" DESC, "c"."id" DESC
       LIMIT $1`,
      [LIST_LIMIT],
    );
    const pictures = await PinView.pictures([...new Set(rows.map((r) => r.pinId))]);
    return rows.map((r) => ({ ...r, ...pictures.get(r.pinId) }));
  }
}
