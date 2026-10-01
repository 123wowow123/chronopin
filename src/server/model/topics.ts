import * as db from '../db';
import { pinConfidenceOf } from './pins';

// Tags and companies as subjects of their own: what the /tag and /company
// landing pages list and show. Every query keeps to live pins the timeline
// would show - minConfidence is its floor (null for none) - so a page never
// counts a pin it does not list.

const SHOWN = `"p"."utcDeletedDateTime" IS NULL AND ($1::integer IS NULL OR COALESCE(${pinConfidenceOf('p')}, $1) >= $1)`;

// How many pins of a subject start from now on and in all, and the ids of
// the soonest upcoming ones and the latest past ones.
export type TopicPinIds = { upcomingIds: number[]; pastIds: number[]; upcoming: number; total: number };

export default class Topics {
  // Every tag on a shown pin with how many it is on, the synthetic Thread
  // tag (kind 'reserved') aside: it says how a pin sits, not what it is about.
  static async tags(minConfidence: number | null) {
    return db.query<{ name: string; kind: string; pins: number }>(
      `
      SELECT "tg"."name"::text AS "name", min("tg"."kind") AS "kind", count(*)::int AS "pins"
      FROM "PinTagView" AS "tg"
        JOIN "Pin" AS "p" ON "p"."id" = "tg"."pinId"
      WHERE "tg"."kind" <> 'reserved' AND ${SHOWN}
      GROUP BY "tg"."name"`,
      [minConfidence],
    );
  }

  static async companies(minConfidence: number | null) {
    return db.query<{ id: number; name: string; pins: number }>(
      `
      SELECT "c"."id", "c"."name"::text AS "name", count(*)::int AS "pins"
      FROM "Company" AS "c"
        JOIN "Pin" AS "p" ON "p"."companyId" = "c"."id"
      WHERE ${SHOWN}
      GROUP BY "c"."id"`,
      [minConfidence],
    );
  }

  static tagPinIds(name: string, now: Date, limits: { upcoming: number; past: number }, minConfidence: number | null) {
    return pinIds(`EXISTS (SELECT 1 FROM "PinTagView" AS "tg" WHERE "tg"."pinId" = "p"."id" AND "tg"."name" = $2::citext)`, name, now, limits, minConfidence);
  }

  static companyPinIds(companyId: number, now: Date, limits: { upcoming: number; past: number }, minConfidence: number | null) {
    return pinIds(`"p"."companyId" = $2::integer`, companyId, now, limits, minConfidence);
  }
}

async function pinIds(
  match: string,
  value: string | number,
  now: Date,
  { upcoming, past }: { upcoming: number; past: number },
  minConfidence: number | null,
): Promise<TopicPinIds> {
  const rows = await db.query<{ id: number; startsLater: boolean }>(
    `
    SELECT "p"."id", "p"."utcStartDateTime" >= $3::timestamptz AS "startsLater"
    FROM "Pin" AS "p"
    WHERE ${match} AND ${SHOWN}
    ORDER BY "p"."utcStartDateTime", "p"."id"`,
    [minConfidence, value, now],
  );
  const later = rows.filter((r) => r.startsLater);
  const before = rows.filter((r) => !r.startsLater);
  return {
    upcomingIds: later.slice(0, upcoming).map((r) => r.id),
    pastIds: before.slice(-past).reverse().map((r) => r.id),
    upcoming: later.length,
    total: rows.length,
  };
}
