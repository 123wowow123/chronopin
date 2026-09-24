import * as db from '../db';
import { cityOf } from '@/lib/city';
import { pinConfidenceOf } from './pins';

// Pin page views, counted once per viewer per UTC day (see 0014).
export default class PinView {
  // viewer: "u:<userId>" or "v:<anonymous visitor id>". Nothing is recorded
  // for a pin that does not exist or was deleted. Answers with the pin's view
  // count, and whether this view was new (not yet counted today).
  static async record(pinId: number, viewer: string): Promise<{ added: boolean; viewCount: number }> {
    const added = await db.query(
      `INSERT INTO "PinView" ("pinId", "viewer")
       SELECT "id", $2 FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL
       ON CONFLICT DO NOTHING
       RETURNING "pinId"`,
      [pinId, viewer],
    );
    const [{ count }] = await db.query<{ count: number }>(`SELECT COUNT(*)::integer AS "count" FROM "PinView" WHERE "pinId" = $1`, [pinId]);
    return { added: added.length > 0, viewCount: count };
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

  // Distinct viewers since a UTC day ("YYYY-MM-DD", null for all time), and the
  // most-viewed live pins over the same days.
  static async summarize(since: string | null, limit = 10) {
    const [[{ viewers }], top] = await Promise.all([
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
    ]);
    const pictures = await PinView.pictures(top.map((p) => p.id));
    return { viewers, top: top.map((p) => ({ ...p, ...pictures.get(p.id) })) };
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
           ORDER BY "pm"."pinId", "m"."type" = '3' DESC, "pm"."id"`,
          [pinIds],
        )
      : [];
    return new Map(rows.map(({ pinId, ...picture }) => [pinId, picture]));
  }
}
