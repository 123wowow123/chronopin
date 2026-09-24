// What the daily jobs read before they decide what to pin or fix: plain
// queries over the app's own tables, so the model spends its reasoning on the
// world rather than on counting (docs/okf/scraping/daily-jobs.md). Each is a
// tool in ./tools.ts.

import { CATEGORIES } from '@/lib/categories';
import { minConfidence } from '@/lib/timelineConfidence';
import { TIMELINE_MIN_CONFIDENCE } from '@/lib/referenceConfidence';
import * as db from '../db';
import { getTimelineConfidence } from '../model/appSetting';
import { pinConfidenceOf } from '../model/pins';
import { CURATORS } from './curators';

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

// How well each named company is covered: its pins in total and ahead of
// today, when a pin of it was last posted, and the tags most of its pins
// share (the company's shared tag, `Abbott` or `J&J`, is usually first). A
// name matches a company whose name equals it or starts with it as a whole
// word ("Abbott" finds "Abbott Laboratories"; the reverse would let "Eli
// Lilly" find a company called "Eli"). Stalest first -
// never pinned, then longest since a post - so a task working through a list
// (the Fortune 100) takes the next companies in turn rather than the same
// few every night.
export async function companyCoverage(names: string[]) {
  const wanted = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 150);
  if (!wanted.length) return [];
  const rows = await db.query<{
    wanted: string;
    companies: { id: number; name: string }[] | null;
    pins: number;
    future: number;
    next90: number;
    lastPosted: Date | null;
    latestEvent: Date | null;
  }>(
    `
    WITH "w" ("wanted") AS (SELECT unnest($1::text[])),
    "m" AS (
      SELECT "w"."wanted", "c"."id", "c"."name"::text AS "name"
      FROM "w" JOIN "Company" AS "c"
        ON lower("c"."name") = lower("w"."wanted")
        OR lower("c"."name") LIKE lower("w"."wanted") || ' %'
    )
    SELECT "w"."wanted",
      (SELECT json_agg(json_build_object('id', "m"."id", 'name', "m"."name")) FROM "m" WHERE "m"."wanted" = "w"."wanted") AS "companies",
      count("p"."id")::int AS "pins",
      count("p"."id") FILTER (WHERE "p"."utcStartDateTime" > now())::int AS "future",
      count("p"."id") FILTER (WHERE "p"."utcStartDateTime" > now() AND "p"."utcStartDateTime" <= now() + interval '90 days')::int AS "next90",
      max("p"."utcCreatedDateTime") AS "lastPosted",
      max("p"."utcStartDateTime") FILTER (WHERE "p"."utcStartDateTime" <= now()) AS "latestEvent"
    FROM "w"
      LEFT JOIN "m" ON "m"."wanted" = "w"."wanted"
      LEFT JOIN "Pin" AS "p" ON "p"."companyId" = "m"."id" AND "p"."utcDeletedDateTime" IS NULL
    GROUP BY "w"."wanted"`,
    [wanted],
  );
  const ids = rows.flatMap((r) => (r.companies ?? []).map((c) => c.id));
  const tags = ids.length
    ? await db.query<{ companyId: number; name: string; pins: number }>(
        `
        SELECT "p"."companyId", "t"."name"::text AS "name", count(DISTINCT "p"."id")::int AS "pins"
        FROM "PinTag" AS "t" JOIN "Pin" AS "p" ON "p"."id" = "t"."pinId" AND "p"."utcDeletedDateTime" IS NULL
        WHERE "p"."companyId" = ANY($1::int[]) AND "t"."kind" = 'topic'
        GROUP BY 1, 2`,
        [ids],
      )
    : [];
  return rows
    .map((r) => {
      const own = new Set((r.companies ?? []).map((c) => c.id));
      const counts = new Map<string, number>();
      for (const t of tags) if (own.has(t.companyId)) counts.set(t.name, (counts.get(t.name) ?? 0) + t.pins);
      const commonTags = [...counts.entries()]
        .filter(([, n]) => r.pins && n / r.pins >= 0.5)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name]) => name);
      const iso = (d: Date | null) => (d ? new Date(d).toISOString() : null);
      return { ...r, companies: r.companies ?? [], lastPosted: iso(r.lastPosted), latestEvent: iso(r.latestEvent), commonTags };
    })
    .sort((a, b) => (a.lastPosted ?? '').localeCompare(b.lastPosted ?? '') || a.pins - b.pins || a.wanted.localeCompare(b.wanted));
}

// The live pins carrying a tag (a topic or category tag, any case), newest
// event first, with their company and source: what a standing beat (Layoffs)
// has already pinned, so a run adds only what is missing and threads new
// pins onto the story they continue.
export async function taggedPins(tag: string, limit = 40) {
  const [counts] = await db.query<{ total: number; future: number }>(
    `
    SELECT count(DISTINCT "p"."id")::int AS "total",
      count(DISTINCT "p"."id") FILTER (WHERE "p"."utcStartDateTime" > now())::int AS "future"
    FROM "PinTag" AS "t" JOIN "Pin" AS "p" ON "p"."id" = "t"."pinId" AND "p"."utcDeletedDateTime" IS NULL
    WHERE lower("t"."name") = lower($1)`,
    [tag],
  );
  const pins = await db.query(
    `
    SELECT DISTINCT ON ("p"."utcStartDateTime", "p"."id") "p"."id", "p"."title", "p"."utcStartDateTime", "p"."dateConfidence",
      "c"."name" AS "company", "p"."sourceUrl", "p"."parentId", "u"."userName" AS "author"
    FROM "PinTag" AS "t"
      JOIN "Pin" AS "p" ON "p"."id" = "t"."pinId" AND "p"."utcDeletedDateTime" IS NULL
      LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"
      LEFT JOIN "User" AS "u" ON "u"."id" = "p"."userId"
    WHERE lower("t"."name") = lower($1)
    ORDER BY "p"."utcStartDateTime" DESC, "p"."id" DESC
    LIMIT $2`,
    [tag, Math.min(limit, 100)],
  );
  return { tag, ...counts, pins };
}

// The pins scored below `below` (default the timeline's own bar, which hides
// them; 70 when the bar is off), for the monthly re-check. Left out: pins
// already marked for revisiting (the revisit queue has them) and pins changed
// in the last `skipDays`, so a pin updated - or found to need nothing - last
// month waits its turn behind the rest. Curators' pins come first, since only
// those can be updated; then lowest score, then longest unchanged. Unscored
// pins (no rated source, no scored reference) are not below any bar - the
// timeline shows them - and are not listed. `exclude` is the pins this run
// has already looked at and left as they were.
export async function lowConfidencePins({ below, limit = 30, skipDays = 25, exclude = [] }: { below?: number; limit?: number; skipDays?: number; exclude?: number[] }) {
  const bar = below ?? minConfidence(await getTimelineConfidence()) ?? TIMELINE_MIN_CONFIDENCE;
  const curators = Object.keys(CURATORS).map((h) => h.replace(/^@/, '').toLowerCase());
  const rows = await db.query<{
    id: number;
    title: string;
    utcStartDateTime: Date;
    dateConfidence: string | null;
    sourceUrl: string | null;
    confidence: number;
    references: number;
    author: string | null;
    editable: boolean;
    lastChanged: Date;
    total: number;
  }>(
    `
    WITH "s" AS (
      SELECT "p"."id", "p"."title", "p"."utcStartDateTime", "p"."dateConfidence", "p"."sourceUrl",
        ${pinConfidenceOf('p')} AS "confidence",
        (SELECT count(*)::int FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id") AS "references",
        "u"."userName"::text AS "author",
        COALESCE(lower(ltrim("u"."userName"::text, '@')) = ANY($2::text[]), false) AS "editable",
        COALESCE("p"."utcUpdatedDateTime", "p"."utcCreatedDateTime") AS "lastChanged"
      FROM "Pin" AS "p" LEFT JOIN "User" AS "u" ON "u"."id" = "p"."userId"
      WHERE "p"."utcDeletedDateTime" IS NULL AND NOT "p"."id" = ANY($5::int[])
        AND COALESCE("p"."utcUpdatedDateTime", "p"."utcCreatedDateTime") < now() - make_interval(days => $3)
        AND NOT EXISTS (SELECT 1 FROM "PinRevisit" AS "v" WHERE "v"."pinId" = "p"."id" AND "v"."utcResolvedDateTime" IS NULL)
    )
    SELECT *, count(*) OVER ()::int AS "total" FROM "s"
    WHERE "confidence" < $1
    ORDER BY "editable" DESC, "confidence", "lastChanged"
    LIMIT $4`,
    [bar, curators, skipDays, limit, exclude],
  );
  return { below: bar, waiting: rows[0]?.total ?? 0, pins: rows.map(({ total: _, ...pin }) => pin) };
}
