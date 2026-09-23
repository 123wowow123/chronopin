// What the daily jobs read before they decide what to pin or fix: plain
// queries over the app's own tables, so the model spends its reasoning on the
// world rather than on counting (docs/okf/scraping/daily-jobs.md). Each is a
// tool in ./tools.ts.

import { CATEGORIES } from '@/lib/categories';
import * as db from '../db';

const DAY_MS = 24 * 60 * 60 * 1000;

// Every category's pins in total, ahead of today, and in the next 90 and 365
// days, thinnest future first. A category can look healthy and be finished:
// the future count, not the total, says whether it needs pins
// (docs/okf/scraping/nightly-jobs.md#why-these-verticals).
export async function categoryCoverage() {
  const rows = await db.query<{ name: string; total: number; future: number; next90: number; next365: number }>(
    `
    SELECT "t"."name"::text AS "name", count(*)::int AS "total",
      count(*) FILTER (WHERE "p"."utcStartDateTime" > now())::int AS "future",
      count(*) FILTER (WHERE "p"."utcStartDateTime" > now() AND "p"."utcStartDateTime" <= now() + interval '90 days')::int AS "next90",
      count(*) FILTER (WHERE "p"."utcStartDateTime" > now() AND "p"."utcStartDateTime" <= now() + interval '365 days')::int AS "next365"
    FROM "PinTag" AS "t" JOIN "Pin" AS "p" ON "p"."id" = "t"."pinId" AND "p"."utcDeletedDateTime" IS NULL
    WHERE "t"."kind" = 'category'
    GROUP BY 1`,
  );
  const byName = new Map(rows.map((r) => [r.name.toLowerCase(), r]));
  const all = CATEGORIES.map((name) => byName.get(name.toLowerCase()) ?? { name, total: 0, future: 0, next90: 0, next365: 0 });
  const [{ live, ahead }] = await db.query<{ live: number; ahead: number }>(
    `SELECT count(*)::int AS "live", count(*) FILTER (WHERE "utcStartDateTime" > now())::int AS "ahead" FROM "Pin" WHERE "utcDeletedDateTime" IS NULL`,
  );
  return {
    livePins: live,
    futurePins: ahead,
    categories: all.sort((a, b) => a.next365 - b.next365 || a.future - b.future || a.total - b.total),
  };
}

// Pin-page opens per category over the last `days` against the `days` before,
// most opened first, with how much each has ahead of today. A PinView is a
// click into a pin, not a card scrolled past.
export async function trendingCategories(days = 7) {
  return db.query<{ name: string; views: number; previousViews: number; viewers: number; futurePins: number }>(
    `
    WITH "v" AS (
      SELECT "t"."name"::text AS "name",
        count(*) FILTER (WHERE "pv"."day" > current_date - $1::int) AS "views",
        count(*) FILTER (WHERE "pv"."day" <= current_date - $1::int) AS "previousViews",
        count(DISTINCT "pv"."viewer") FILTER (WHERE "pv"."day" > current_date - $1::int) AS "viewers"
      FROM "PinView" AS "pv" JOIN "PinTag" AS "t" ON "t"."pinId" = "pv"."pinId" AND "t"."kind" = 'category'
      WHERE "pv"."day" > current_date - 2 * $1::int
      GROUP BY 1
    )
    SELECT "v"."name", "v"."views"::int, "v"."previousViews"::int, "v"."viewers"::int,
      (SELECT count(*)::int FROM "PinTag" AS "t" JOIN "Pin" AS "p" ON "p"."id" = "t"."pinId" AND "p"."utcDeletedDateTime" IS NULL
        WHERE "t"."kind" = 'category' AND "t"."name" = "v"."name" AND "p"."utcStartDateTime" > now()) AS "futurePins"
    FROM "v" WHERE "v"."views" > 0
    ORDER BY "v"."views" DESC, "v"."viewers" DESC
    LIMIT 25`,
    [days],
  );
}

// The most opened pins of the last `days`, for the pin-health scan and to show
// which subjects inside a trending category are drawing readers.
export function mostViewedPins(days = 7, limit = 30) {
  return db.query<{ id: number; title: string; views: number; utcStartDateTime: Date }>(
    `
    SELECT "p"."id", "p"."title", count(*)::int AS "views", "p"."utcStartDateTime"
    FROM "PinView" AS "pv" JOIN "Pin" AS "p" ON "p"."id" = "pv"."pinId" AND "p"."utcDeletedDateTime" IS NULL
    WHERE "pv"."day" > current_date - $1::int
    GROUP BY "p"."id"
    ORDER BY 3 DESC, "p"."id" DESC
    LIMIT $2`,
    [days, limit],
  );
}

// Recent comments with the pin each is on, newest first. Finding the topics
// in them is the model's job; this only gathers them.
export function recentComments(days = 14, limit = 200) {
  return db.query<{ pinId: number; pinTitle: string; text: string; sentiment: number | null; at: Date }>(
    `
    SELECT "c"."pinId", "p"."title" AS "pinTitle", left("c"."text", 600) AS "text", "c"."sentiment", "c"."utcCreatedDateTime" AS "at"
    FROM "Comment" AS "c" JOIN "Pin" AS "p" ON "p"."id" = "c"."pinId" AND "p"."utcDeletedDateTime" IS NULL
    WHERE "c"."utcDeletedDateTime" IS NULL AND "c"."utcCreatedDateTime" > now() - make_interval(days => $1)
    ORDER BY "c"."utcCreatedDateTime" DESC
    LIMIT $2`,
    [days, limit],
  );
}

// Where the active users are: signed-in people who opened, liked, favourited
// or commented on a pin in the last `days`, grouped by their saved default
// location (User.location*, 0066; rounded to about a kilometre, named by the
// geocoder). Each place says how many pins already sit within `radiusKm` over
// the next 60 days, so a well-covered city is not pinned again. People with
// no saved location are only counted - their place is never guessed.
export async function activeUserPlaces(days = 30, radiusKm = 50) {
  const places = await db.query<{ place: string; latitude: number; longitude: number; users: number; upcomingNearby: number }>(
    `
    WITH "active" AS (
      SELECT substring("viewer" FROM 3)::int AS "id" FROM "PinView" WHERE "viewer" LIKE 'u:%' AND "day" > current_date - $1::int
      UNION SELECT "userId" FROM "Comment" WHERE "utcCreatedDateTime" > now() - make_interval(days => $1)
    ), "located" AS (
      SELECT "u"."locationName" AS "place", avg("u"."locationLatitude") AS "latitude", avg("u"."locationLongitude") AS "longitude", count(*)::int AS "users"
      FROM "User" AS "u" JOIN "active" AS "a" ON "a"."id" = "u"."id"
      WHERE "u"."utcDeletedDateTime" IS NULL AND "u"."locationLatitude" IS NOT NULL
      GROUP BY 1
    )
    SELECT "l".*,
      (SELECT count(*)::int FROM "Pin" AS "p"
        WHERE "p"."utcDeletedDateTime" IS NULL AND "p"."location" IS NOT NULL
          AND "p"."utcStartDateTime" BETWEEN now() AND now() + interval '60 days'
          AND ST_DWithin("p"."location", ST_SetSRID(ST_MakePoint("l"."longitude", "l"."latitude"), 4326)::geography, $2 * 1000)) AS "upcomingNearby"
    FROM "located" AS "l"
    ORDER BY "l"."users" DESC
    LIMIT 25`,
    [days, radiusKm],
  );
  const [{ unlocated }] = await db.query<{ unlocated: number }>(
    `
    SELECT count(DISTINCT "u"."id")::int AS "unlocated" FROM "User" AS "u"
    WHERE "u"."utcDeletedDateTime" IS NULL AND "u"."locationLatitude" IS NULL AND "u"."id" IN (
      SELECT substring("viewer" FROM 3)::int FROM "PinView" WHERE "viewer" LIKE 'u:%' AND "day" > current_date - $1::int
      UNION SELECT "userId" FROM "Comment" WHERE "utcCreatedDateTime" > now() - make_interval(days => $1))`,
    [days],
  );
  return { places, activeUsersWithoutLocation: unlocated };
}

// Pins that start (or are running) between yesterday and a week out, with
// what vetting they carry, least vetted first.
export function pinsThisWeek(limit = 60) {
  return db.query(
    `
    SELECT "p"."id", "p"."title", "p"."utcStartDateTime", "p"."utcEndDateTime", "p"."dateConfidence", "p"."sourceUrl",
      COALESCE("p"."utcUpdatedDateTime", "p"."utcCreatedDateTime") AS "lastChanged", "u"."userName" AS "author",
      (SELECT count(*)::int FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id") AS "references",
      (SELECT count(*)::int FROM "PinMedium" AS "pm" WHERE "pm"."pinId" = "p"."id" AND "pm"."utcDeletedDateTime" IS NULL) AS "media",
      "p"."address" IS NOT NULL AS "hasPlace"
    FROM "Pin" AS "p" LEFT JOIN "User" AS "u" ON "u"."id" = "p"."userId"
    WHERE "p"."utcDeletedDateTime" IS NULL
      AND "p"."utcStartDateTime" < now() + interval '7 days'
      AND COALESCE("p"."utcEndDateTime", "p"."utcStartDateTime") > now() - interval '1 day'
    ORDER BY 9, 10, "p"."utcStartDateTime"
    LIMIT $1`,
    [limit],
  );
}

// Pins whose date is not firm yet and falls in the next `days`: an estimate or
// an unknown can usually be confirmed as the day gets closer.
export function softDatedSoon(days = 30, limit = 30) {
  return db.query<{ id: number; title: string; utcStartDateTime: Date; dateConfidence: string | null; sourceUrl: string | null }>(
    `
    SELECT "id", "title", "utcStartDateTime", "dateConfidence", "sourceUrl" FROM "Pin"
    WHERE "utcDeletedDateTime" IS NULL AND "dateConfidence" IN ('estimated', 'unknown', 'delayed')
      AND "utcStartDateTime" BETWEEN now() AND now() + make_interval(days => $1)
    ORDER BY "utcStartDateTime" LIMIT $2`,
    [days, limit],
  );
}

// Live pins matching every word of `text` in the title (as whole words, with
// anything between them, the way the trends check matches), or with this
// exact source URL, optionally near a date. The already-pinned test a job
// runs before it creates anything; the create route's own duplicate checks
// still follow.
export async function findPins({ text, sourceUrl, around, windowDays = 30, limit = 15 }: { text?: string; sourceUrl?: string; around?: string; windowDays?: number; limit?: number }) {
  const words = (text ?? '').split(/[^\p{L}\p{N}]+/u).filter(Boolean).map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const params: unknown[] = [];
  const where: string[] = ['"p"."utcDeletedDateTime" IS NULL'];
  const or: string[] = [];
  if (words.length) {
    params.push(words.map((w) => `\\m${w}\\M`));
    or.push(`(SELECT bool_and("p"."title" ~* "w") FROM unnest($${params.length}::text[]) AS "w")`);
  }
  if (sourceUrl) {
    params.push(sourceUrl);
    or.push(`"p"."sourceUrl" = $${params.length}`);
  }
  if (!or.length) return [];
  where.push(`(${or.join(' OR ')})`);
  const at = around ? new Date(around) : null;
  if (at && !Number.isNaN(at.getTime())) {
    params.push(new Date(at.getTime() - windowDays * DAY_MS), new Date(at.getTime() + windowDays * DAY_MS));
    where.push(`"p"."utcStartDateTime" BETWEEN $${params.length - 1} AND $${params.length}`);
  }
  params.push(Math.min(limit, 50));
  return db.query(
    `
    SELECT "p"."id", "p"."title", "p"."utcStartDateTime", "p"."sourceUrl", "p"."parentId", "u"."userName" AS "author",
      ARRAY(SELECT "t"."name"::text FROM "PinTag" AS "t" WHERE "t"."pinId" = "p"."id" AND "t"."kind" = 'category') AS "categories"
    FROM "Pin" AS "p" LEFT JOIN "User" AS "u" ON "u"."id" = "p"."userId"
    WHERE ${where.join(' AND ')}
    ORDER BY "p"."utcStartDateTime" DESC
    LIMIT $${params.length}`,
    params,
  );
}

// Pins changed since `since`, or created then, for the news check's "what is
// new since the last run".
export function pinsChangedSince(since: Date, limit = 50) {
  return db.query(
    `
    SELECT "id", "title", "utcStartDateTime", COALESCE("utcUpdatedDateTime", "utcCreatedDateTime") AS "changed"
    FROM "Pin" WHERE "utcDeletedDateTime" IS NULL AND COALESCE("utcUpdatedDateTime", "utcCreatedDateTime") > $1
    ORDER BY 4 DESC LIMIT $2`,
    [since, limit],
  );
}
