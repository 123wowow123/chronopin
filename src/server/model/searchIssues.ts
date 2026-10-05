// What may keep pin pages out of Google, or count against the site, for the
// admin Search tab (/admin/search). Read straight off "Pin", live pins only.
import { MIN_SOURCES, THIN_TEXT_CHARS } from '@/lib/searchQuality';
import * as db from '../db';

// A pin's summary text length and its cited pages, the SQL twins of
// pinTextLength and pinSourceCount (src/lib/searchQuality.ts). `p` is the
// Pin row's alias.
export const textLengthSql = (p: string) =>
  `(length(regexp_replace(coalesce(${p}."description", ''), '<[^>]+>', '', 'g')) + length(regexp_replace(coalesce(${p}."longFormSummary", ''), '<[^>]+>', '', 'g')))`;
export const sourceCountSql = (p: string) =>
  `((CASE WHEN coalesce(trim(${p}."sourceUrl"), '') <> '' THEN 1 ELSE 0 END) + (SELECT count(*) FROM "PinReference" AS "r" WHERE "r"."pinId" = ${p}."id" AND "r"."url" IS DISTINCT FROM trim(${p}."sourceUrl")))`;

// Whether the pin is thin (thinReasons is non-empty).
export const THIN_PIN_SQL = (p: string) => `(${textLengthSql(p)} < ${THIN_TEXT_CHARS} OR ${sourceCountSql(p)} < ${MIN_SOURCES})`;

// Past this, Google cuts a title short in its results.
export const LONG_TITLE_CHARS = 70;

export type SearchIssueCounts = {
  pins: number;
  thin: number;
  shortText: number;
  oneSource: number;
  both: number;
  noDescription: number;
  longTitles: number;
  noMedia: number;
  duplicateTitlePins: number;
  duplicateTitleGroups: number;
};

export type ThinPinRow = { id: number; title: string; textLength: number; sources: number; userName: string | null; utcCreatedDateTime: Date };

export type DuplicateTitleRow = { title: string; ids: number[] };

export type PinIssueRow = { id: number; title: string; titleLength: number };

export async function counts(): Promise<SearchIssueCounts> {
  const [row] = await db.query<Record<keyof SearchIssueCounts, string>>(
    `
    WITH "p" AS (
      SELECT "p"."id", "p"."title", "p"."description", "p"."longFormSummary",
        ${textLengthSql('"p"')} AS "len", ${sourceCountSql('"p"')} AS "sources",
        EXISTS (SELECT 1 FROM "PinMedium" AS "m" WHERE "m"."pinId" = "p"."id" AND "m"."utcDeletedDateTime" IS NULL) AS "hasMedia"
      FROM "Pin" AS "p"
      WHERE "p"."utcDeletedDateTime" IS NULL
    ), "dupes" AS (
      SELECT lower(trim("title")) AS "t", count(*) AS "n" FROM "p" GROUP BY 1 HAVING count(*) > 1
    )
    SELECT count(*) AS "pins",
      count(*) FILTER (WHERE "len" < $1 OR "sources" < $2) AS "thin",
      count(*) FILTER (WHERE "len" < $1) AS "shortText",
      count(*) FILTER (WHERE "sources" < $2) AS "oneSource",
      count(*) FILTER (WHERE "len" < $1 AND "sources" < $2) AS "both",
      count(*) FILTER (WHERE coalesce(trim("description"), '') = '' AND coalesce(trim("longFormSummary"), '') = '') AS "noDescription",
      count(*) FILTER (WHERE length("title") > $3) AS "longTitles",
      count(*) FILTER (WHERE NOT "hasMedia") AS "noMedia",
      (SELECT coalesce(sum("n"), 0) FROM "dupes") AS "duplicateTitlePins",
      (SELECT count(*) FROM "dupes") AS "duplicateTitleGroups"
    FROM "p"`,
    [THIN_TEXT_CHARS, MIN_SOURCES, LONG_TITLE_CHARS],
  );
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)])) as SearchIssueCounts;
}

// The thin pins, thinnest text first.
export function thinPins(limit: number) {
  return db.query<ThinPinRow>(
    `
    SELECT * FROM (
      SELECT "p"."id", "p"."title", ${textLengthSql('"p"')}::int AS "textLength", ${sourceCountSql('"p"')}::int AS "sources",
        "u"."userName", "p"."utcCreatedDateTime"
      FROM "Pin" AS "p" LEFT JOIN "User" AS "u" ON "u"."id" = "p"."userId"
      WHERE "p"."utcDeletedDateTime" IS NULL
    ) AS "x"
    WHERE "textLength" < $1 OR "sources" < $2
    ORDER BY "textLength", "sources", "id" DESC
    LIMIT $3`,
    [THIN_TEXT_CHARS, MIN_SOURCES, limit],
  );
}

// Live pins that share a title (case and spacing aside): pages Google may
// fold into one, or read as copies.
export function duplicateTitles(limit: number) {
  return db.query<DuplicateTitleRow>(
    `
    SELECT min("title") AS "title", array_agg("id" ORDER BY "id") AS "ids"
    FROM "Pin"
    WHERE "utcDeletedDateTime" IS NULL
    GROUP BY lower(trim("title"))
    HAVING count(*) > 1
    ORDER BY count(*) DESC, min("id") DESC
    LIMIT $1`,
    [limit],
  );
}

// Live pins whose title runs past what a search result shows, longest first.
export function longTitles(limit: number) {
  return db.query<PinIssueRow>(
    `
    SELECT "id", "title", length("title") AS "titleLength"
    FROM "Pin"
    WHERE "utcDeletedDateTime" IS NULL AND length("title") > $1
    ORDER BY length("title") DESC, "id" DESC
    LIMIT $2`,
    [LONG_TITLE_CHARS, limit],
  );
}

// Live pins with no picture or video: their share card is generated and
// they cannot show in image results.
export function noMedia(limit: number) {
  return db.query<PinIssueRow>(
    `
    SELECT "p"."id", "p"."title", length("p"."title") AS "titleLength"
    FROM "Pin" AS "p"
    WHERE "p"."utcDeletedDateTime" IS NULL
      AND NOT EXISTS (SELECT 1 FROM "PinMedium" AS "m" WHERE "m"."pinId" = "p"."id" AND "m"."utcDeletedDateTime" IS NULL)
    ORDER BY "p"."id" DESC
    LIMIT $1`,
    [limit],
  );
}
