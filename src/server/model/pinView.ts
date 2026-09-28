import * as db from '../db';
import { cityOf } from '@/lib/city';
import { locateUnlocated } from './ipPlaces';
import { pinConfidenceOf } from './pins';

// Pin page views, counted once per viewer per UTC day (see 0014).
export default class PinView {
  // viewer: "u:<userId>" or "v:<anonymous visitor id>"; ip is the address the
  // view came from (0089), kept from the day's first view. Nothing is recorded
  // for a pin that does not exist or was deleted. Answers with the pin's view
  // count, and whether this view was new (not yet counted today).
  static async record(pinId: number, viewer: string, ip: string | null): Promise<{ added: boolean; viewCount: number }> {
    const userId = /^u:\d+$/.test(viewer) ? Number(viewer.slice(2)) : null;
    const added = await db.query(
      `INSERT INTO "PinView" ("pinId", "viewer", "userId", "ip")
       SELECT "id", $2, $3::integer, $4::inet FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL
       ON CONFLICT DO NOTHING
       RETURNING "pinId"`,
      [pinId, viewer, userId, ip],
    );
    const [{ count }] = await db.query<{ count: number }>(`SELECT COUNT(*)::integer AS "count" FROM "PinView" WHERE "pinId" = $1`, [pinId]);
    return { added: added.length > 0, viewCount: count };
  }

  // Places every view whose address has not been looked up yet.
  static locateUnlocated(): Promise<number> {
    return locateUnlocated('PinView');
  }

  // Views per UTC day, split by signed-in users and anonymous visitors.
  static async listDaily(): Promise<{ day: string; signedIn: number; guests: number }[]> {
    return db.query(`
    SELECT to_char("day", 'YYYY-MM-DD') AS "day",
      COUNT(*) FILTER (WHERE "viewer" LIKE 'u:%')::integer AS "signedIn",
      COUNT(*) FILTER (WHERE "viewer" NOT LIKE 'u:%')::integer AS "guests"
    FROM "PinView"
    GROUP BY "day"
    ORDER BY "day"`);
  }

  // Distinct viewers since a UTC day ("YYYY-MM-DD", null for all time), the
  // most-viewed live pins over the same days, and where the views came from.
  static async summarize(since: string | null, limit = 10) {
    const [[{ viewers }], top, places] = await Promise.all([
      db.query<{ viewers: number }>(
        `SELECT COUNT(DISTINCT "viewer")::integer AS "viewers"
         FROM "PinView"
         WHERE $1::date IS NULL OR "day" >= $1::date`,
        [since],
      ),
      db.query<{ id: number; title: string; views: number; viewers: number }>(
        `SELECT "p"."id", "p"."title",
           COUNT(*)::integer AS "views",
           COUNT(DISTINCT "v"."viewer")::integer AS "viewers"
         FROM "PinView" AS "v"
           JOIN "Pin" AS "p" ON "p"."id" = "v"."pinId" AND "p"."utcDeletedDateTime" IS NULL
         WHERE $1::date IS NULL OR "v"."day" >= $1::date
         GROUP BY "p"."id", "p"."title"
         ORDER BY "views" DESC, "viewers" DESC, "p"."id"
         LIMIT $2`,
        [since, limit],
      ),
      PinView.places(since),
    ]);
    const ids = top.map((p) => p.id);
    const [pictures, pinPlaces] = await Promise.all([PinView.pictures(ids), PinView.pinPlaces(ids, since)]);
    return { viewers, top: top.map((p) => ({ ...p, ...pictures.get(p.id), places: pinPlaces.get(p.id) ?? [] })), ...places };
  }

  // Where each pin's views since a UTC day (null for all time) came from, as
  // "city, region, country" with its views and distinct viewers, most first.
  // place is "" for a view that was looked up but not placed, and null for one
  // with no address (before 0089).
  static async pinPlaces(pinIds: number[], since: string | null) {
    const rows = pinIds.length
      ? await db.query<{ pinId: number; place: string | null; views: number; viewers: number }>(
          `SELECT "pinId", CASE WHEN "ip" IS NOT NULL THEN concat_ws(', ', "city", "region", "country") END AS "place",
             COUNT(*)::integer AS "views", COUNT(DISTINCT "viewer")::integer AS "viewers"
           FROM "PinView"
           WHERE "pinId" = ANY($1::integer[]) AND ($2::date IS NULL OR "day" >= $2::date)
           GROUP BY 1, 2
           ORDER BY "pinId", "views" DESC, "viewers" DESC, 2 NULLS LAST`,
          [pinIds, since],
        )
      : [];
    const byPin = new Map<number, { place: string | null; views: number; viewers: number }[]>();
    for (const { pinId, ...place } of rows) byPin.set(pinId, [...(byPin.get(pinId) ?? []), place]);
    return byPin;
  }

  // Views with an address since a UTC day (null for all time): by country
  // ("" while unplaced), by city, and as points for a map (to a tenth of a
  // degree), each with its views and distinct viewers, most first.
  static async places(since: string | null) {
    const range = `"ip" IS NOT NULL AND ($1::date IS NULL OR "day" >= $1::date)`;
    const [[{ located }], countries, cities, points] = await Promise.all([
      db.query<{ located: number }>(`SELECT COUNT(*)::integer AS "located" FROM "PinView" WHERE ${range}`, [since]),
      db.query<{ country: string; views: number; viewers: number }>(
        `SELECT COALESCE("country", '') AS "country", COUNT(*)::integer AS "views", COUNT(DISTINCT "viewer")::integer AS "viewers"
         FROM "PinView" WHERE ${range}
         GROUP BY 1 ORDER BY "views" DESC, "viewers" DESC, 1
         LIMIT 30`,
        [since],
      ),
      db.query<{ city: string; views: number; viewers: number }>(
        `SELECT concat_ws(', ', "city", "region", "country") AS "city", COUNT(*)::integer AS "views", COUNT(DISTINCT "viewer")::integer AS "viewers"
         FROM "PinView" WHERE ${range} AND "city" IS NOT NULL
         GROUP BY 1 ORDER BY "views" DESC, "viewers" DESC, 1
         LIMIT 15`,
        [since],
      ),
      db.query<{ label: string; latitude: number; longitude: number; views: number }>(
        `SELECT MIN(concat_ws(', ', "city", "region", "country")) AS "label",
           AVG("latitude") AS "latitude", AVG("longitude") AS "longitude", COUNT(*)::integer AS "views"
         FROM "PinView" WHERE ${range} AND "latitude" IS NOT NULL AND "longitude" IS NOT NULL
         GROUP BY round("latitude"::numeric, 1), round("longitude"::numeric, 1)
         ORDER BY "views" DESC
         LIMIT 500`,
        [since],
      ),
    ]);
    return { located, countries, cities, points };
  }

  // The latest views that carry an address, newest first, with the pin's title
  // and the viewer's user name.
  static async latest(limit = 50) {
    return db.query<{
      pinId: number;
      title: string | null;
      at: string;
      userId: number | null;
      userName: string | null;
      ip: string;
      place: string;
    }>(
      `SELECT "v"."pinId", "p"."title",
         to_char("v"."utcCreatedDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "at",
         "v"."userId", "u"."userName", host("v"."ip") AS "ip",
         concat_ws(', ', "v"."city", "v"."region", "v"."country") AS "place"
       FROM "PinView" AS "v"
         LEFT JOIN "Pin" AS "p" ON "p"."id" = "v"."pinId"
         LEFT JOIN "User" AS "u" ON "u"."id" = "v"."userId"
       WHERE "v"."ip" IS NOT NULL AND "v"."utcCreatedDateTime" IS NOT NULL
       ORDER BY "v"."utcCreatedDateTime" DESC
       LIMIT $1`,
      [limit],
    );
  }

  // The most viewed live pins whose views are rising: views over the last
  // `days` UTC days (today included) against the `days` before them, keeping
  // only pins with more now than then, busiest first. Pins the timeline hides
  // for confidence (minConfidence, null for none) are left out here too.
  static async trending(days: number, limit: number, minConfidence: number | null) {
    const top = await db.query<{ id: number; title: string; category: string | null; address: string | null; utcStartDateTime: Date; allDay: boolean; views: number; previousViews: number }>(
      `SELECT "p"."id", "p"."title",
         (SELECT "c"."name"::text FROM "PinTag" AS "c" WHERE "c"."pinId" = "p"."id" AND "c"."kind" = 'category' ORDER BY "c"."id" LIMIT 1) AS "category",
         "p"."address", "p"."utcStartDateTime", "p"."allDay", "t"."views", "t"."previousViews"
       FROM (
         SELECT "pinId",
           COUNT(*) FILTER (WHERE "day" > (now() AT TIME ZONE 'UTC')::date - $1::integer)::integer AS "views",
           COUNT(*) FILTER (WHERE "day" <= (now() AT TIME ZONE 'UTC')::date - $1::integer)::integer AS "previousViews"
         FROM "PinView"
         WHERE "day" > (now() AT TIME ZONE 'UTC')::date - 2 * $1::integer
         GROUP BY "pinId"
       ) AS "t"
         JOIN "Pin" AS "p" ON "p"."id" = "t"."pinId" AND "p"."utcDeletedDateTime" IS NULL
       WHERE "t"."views" > "t"."previousViews"
         AND ($3::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $3) >= $3)
       ORDER BY "t"."views" DESC, "t"."views" - "t"."previousViews" DESC, "p"."id" DESC
       LIMIT $2`,
      [days, limit, minConfidence],
    );
    const pictures = await PinView.pictures(top.map((p) => p.id));
    return top.map(({ address, ...p }) => ({ ...p, city: cityOf(address), utcStartDateTime: p.utcStartDateTime.toISOString(), ...pictures.get(p.id) }));
  }

  // Each pin's picture as the map popup picks it: a video's still first, else
  // its first medium. originalUrl is only set for images (a fallback when the
  // thumb is missing); a video's is the page, not a picture.
  static async pictures(pinIds: number[]) {
    const rows = pinIds.length
      ? await db.query<{ pinId: number; thumbName: string | null; originalUrl: string | null }>(
          `SELECT DISTINCT ON ("pm"."pinId") "pm"."pinId", "m"."thumbName",
             CASE WHEN "m"."type" = '1' THEN "m"."originalUrl" END AS "originalUrl"
           FROM "PinMedium" AS "pm"
             JOIN "Medium" AS "m" ON "m"."id" = "pm"."mediumId"
           WHERE "pm"."pinId" = ANY($1::integer[]) AND "pm"."utcDeletedDateTime" IS NULL
           ORDER BY "pm"."pinId", "pm"."weight" DESC, "m"."type" = '3' DESC, "pm"."id"`,
          [pinIds],
        )
      : [];
    return new Map(rows.map(({ pinId, ...picture }) => [pinId, picture]));
  }
}
