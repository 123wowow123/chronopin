// A pin's tags (0038), its categories among them (0043). The form's own ("user") are replaced wholesale by a
// create or edit that sends tags; the awards its description and summary name
// and the prediction markets its links cite ("auto") are re-read after every save. Award tags from PinAward need no
// writing: PinTagView derives them. See src/lib/tags.ts.

import { autoTags, tagKind, uniqueTags, type TagCount, type TagSource } from '@/lib/tags';
import * as db from '../db';
import { wordStartPattern } from '../util/searchQuery';

type Stored = Exclude<TagSource, 'award'>;

// SQL for a pin's categories, the main one first, in a query on "Pin" (not aliased).
export const PIN_CATEGORIES = `ARRAY(SELECT "cat"."name"::text FROM "PinTag" AS "cat" WHERE "cat"."pinId" = "Pin"."id" AND "cat"."kind" = 'category' ORDER BY "cat"."id")`;

// SQL for whether "Pin" has any of the categories in a citext[] parameter.
export const inCategories = (param: string) =>
  `EXISTS (SELECT 1 FROM "PinTag" AS "cat" WHERE "cat"."pinId" = "Pin"."id" AND "cat"."kind" = 'category' AND "cat"."name" = ANY(${param}::citext[]))`;

// Replaces the pin's tags from this source with these names: its categories,
// or the rest. True when they changed.
async function replace(pinId: number, source: Stored, names: string[], categories = false): Promise<boolean> {
  const wanted = uniqueTags(names).filter((name) => (tagKind(name) === 'category') === categories);
  const scope = `"pinId" = $1 AND "source" = $2 AND ("kind" = 'category') = $3`;
  const stored = await db.query<{ name: string }>(`SELECT "name"::text AS "name" FROM "PinTag" WHERE ${scope} ORDER BY "id"`, [pinId, source, categories]);
  // Categories keep their order: the first is the pin's main one.
  const same = stored.length === wanted.length && stored.every((row, i) => (categories ? wanted[i] === row.name : wanted.includes(row.name)));
  if (same) return false;
  await db.transaction(async (query) => {
    await query(`DELETE FROM "PinTag" WHERE ${scope}`, [pinId, source, categories]);
    if (!wanted.length) return;
    // A name the other source already holds stays theirs; the view shows it once either way.
    await query(
      `INSERT INTO "PinTag" ("pinId", "name", "kind", "source")
       SELECT $1, "t"."name", "t"."kind", $4 FROM unnest($2::citext[], $3::varchar[]) AS "t" ("name", "kind")
       ON CONFLICT ("pinId", "name") DO NOTHING`,
      [pinId, wanted, wanted.map(tagKind), source],
    );
  });
  return true;
}

export default class PinTag {
  // The form's tags: the whole list, so a name left out is taken off. A
  // category's name among them is left to setCategories.
  static setUserTags(pinId: number, names: string[]): Promise<boolean> {
    return replace(pinId, 'user', names);
  }

  // The pin's categories, the main one first: the whole list.
  static setCategories(pinId: number, names: string[]): Promise<boolean> {
    return replace(pinId, 'user', names, true);
  }

  // What the pin's own prose and links say: the awards it names and the
  // prediction markets it cites. True when they changed.
  static async syncAutoTags(pinId: number): Promise<boolean> {
    const pin = await PinTag.autoSource(pinId);
    if (!pin) return false;
    return replace(pinId, 'auto', autoTags(pin));
  }

  // The fields autoTags reads, or null for a deleted pin.
  static async autoSource(pinId: number) {
    const [pin] = await db.query<{ description: string | null; longFormSummary: string | null; sourceUrl: string | null; references: { url: string }[] }>(
      `SELECT "p"."description", "p"."longFormSummary", "p"."sourceUrl",
         COALESCE((SELECT json_agg(json_build_object('url', "r"."url")) FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id"), '[]') AS "references"
       FROM "Pin" AS "p" WHERE "p"."id" = $1 AND "p"."utcDeletedDateTime" IS NULL`,
      [pinId],
    );
    return pin ?? null;
  }

  // Every stored tag (the derived award ones are not rows), for the backup.
  static getAll(): Promise<{ id: number; pinId: number; name: string; kind: string; source: string; utcCreatedDateTime: Date }[]> {
    return db.query(`SELECT "id", "pinId", "name"::text AS "name", "kind", "source", "utcCreatedDateTime" FROM "PinTag" ORDER BY "id"`);
  }

  static async restore(rows: { id: number; pinId: number; name: string; kind: string; source: string; utcCreatedDateTime: string }[]): Promise<void> {
    for (const t of rows) {
      await db.query(
        `INSERT INTO "PinTag" ("id", "pinId", "name", "kind", "source", "utcCreatedDateTime") VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [t.id, t.pinId, t.name, t.kind, t.source, t.utcCreatedDateTime],
      );
    }
    await db.query(`SELECT setval(pg_get_serial_sequence('"PinTag"', 'id'), GREATEST((SELECT MAX("id") FROM "PinTag"), 1))`);
  }

  // Tags with a word starting with the typed text, busiest first, for the
  // search suggestions.
  static suggest(text: string, limit: number): Promise<TagCount[]> {
    return db.query<TagCount>(
      `
      SELECT min("tg"."name"::text) AS "name", min("tg"."kind") AS "kind", COUNT(DISTINCT "Pin"."id")::integer AS "count"
      FROM "PinTagView" AS "tg"
        INNER JOIN "Pin" ON "Pin"."id" = "tg"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
      WHERE "tg"."name"::text ~* $1
      GROUP BY "tg"."name"
      ORDER BY 3 DESC, 1
      LIMIT $2`,
      [wordStartPattern(text), limit],
    );
  }

  // Every tag's pin count across these pins (the FROM and WHERE of a search,
  // see model/pins.ts), busiest first. One spelling per name whatever its case.
  // Each but a category also says which category most of those pins carry,
  // for the cloud's grouped mode.
  static async count(from: string, where: string[], params: unknown[], limit: number): Promise<TagCount[]> {
    const rows = await db.query<TagCount>(
      `
      WITH "hits" AS (
        SELECT DISTINCT "tg"."name", "tg"."kind", "Pin"."id" AS "pinId"
        ${from}
          INNER JOIN "PinTagView" AS "tg" ON "tg"."pinId" = "Pin"."id"
        WHERE ${where.join('\n          AND ')}
      ),
      "counts" AS (
        SELECT "name", min("name"::text) AS "spelling", min("kind") AS "kind", COUNT(DISTINCT "pinId")::integer AS "count"
        FROM "hits"
        GROUP BY "name"
        ORDER BY 4 DESC, 2
        LIMIT ${Number(limit)}
      ),
      "homes" AS (
        SELECT "h"."name", "c"."name"::text AS "category",
          row_number() OVER (PARTITION BY "h"."name" ORDER BY COUNT(*) DESC, min("c"."name"::text)) AS "rank"
        FROM "hits" AS "h"
          INNER JOIN "counts" ON "counts"."name" = "h"."name" AND "counts"."kind" <> 'category'
          INNER JOIN "PinTag" AS "c" ON "c"."pinId" = "h"."pinId" AND "c"."kind" = 'category'
        GROUP BY "h"."name", "c"."name"
      )
      SELECT "counts"."spelling" AS "name", "counts"."kind", "counts"."count", "homes"."category"
      FROM "counts"
        LEFT JOIN "homes" ON "homes"."name" = "counts"."name" AND "homes"."rank" = 1
      ORDER BY "counts"."count" DESC, "counts"."spelling"`,
      params,
    );
    return rows;
  }
}
