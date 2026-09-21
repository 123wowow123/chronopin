import { createHash } from 'node:crypto';
import { urlKey as keyOf } from '@/lib/citations';
import * as db from '../db';
import type { QueryFn } from '../db';
import type { SourceKind } from '@/lib/sourceKind';

// A link some pin cites, and its wiki (see 0026_source_wiki.sql).

export type SourceStatus = 'pending' | 'ready' | 'failed';
export type PinSourceRole = 'source' | 'reference';

export type SourceRow = {
  id: number;
  urlKey: string;
  url: string;
  kind: SourceKind;
  title: string | null;
  status: SourceStatus;
  text: string | null;
  textHash: string | null;
  sourceModifiedDate: string | null;
  generatedBy: string | null;
  wikiVersion: number;
  attempts: number;
  lastError: string | null;
  utcFetchedDateTime: Date | null;
  utcAttemptedDateTime: Date | null;
  utcBuiltDateTime: Date | null;
  utcCreatedDateTime: Date;
};

// A wiki page as written, before it has ids: its sub-pages nest in children.
export type WikiDraft = { type: string; title: string; summary: string; body: string; tags: string[]; children?: WikiDraft[] };

export type WikiPage = {
  id: number;
  sourceId: number;
  parentId: number | null;
  position: number;
  type: string;
  title: string;
  summary: string;
  body: string;
  tags: string[];
  children: WikiPage[];
};

export type PinSourceRow = {
  pinId: number;
  sourceId: number;
  role: PinSourceRole;
  summarizedWikiVersion: number | null;
  utcRemovedDateTime: Date | null;
};

// Keys past this are too long to index; such links get no wiki.
const MAX_KEY_CHARS = 2000;
// Tries a failed source gets before only a forced retry will take it.
export const MAX_ATTEMPTS = 3;

export const sourceKey = (url: string | null | undefined): string | undefined => {
  const key = url ? keyOf(url) : undefined;
  return key && key.length <= MAX_KEY_CHARS ? key : undefined;
};

export const hashText = (text: string) => createHash('sha256').update(text).digest('hex');

// A scraped page can carry a NUL byte - a truncated multi-byte character, a
// binary blob inside the markup, a mangled archive capture - and Postgres
// rejects one in a text column outright, so the write throws rather than the
// column holding anything odd. It is stripped here, where the text meets the
// database, because every writer comes through these two methods. Stripped
// before hashing, so the hash is of what is actually stored.
export const storableText = (text: string) => text.replace(/\0/g, '');

// Columns other than text, which can be long and is only needed to write a wiki.
const META = `"id", "urlKey", "url", "kind", "title", "status", "textHash",
  to_char("sourceModifiedDate", 'YYYY-MM-DD') AS "sourceModifiedDate", "generatedBy", "wikiVersion", "attempts", "lastError",
  "utcFetchedDateTime", "utcAttemptedDateTime", "utcBuiltDateTime", "utcCreatedDateTime"`;

export default class Source {
  // The source for a link, created pending when new. Resolves to undefined
  // for a link that is not http(s) or is too long to key.
  static async ensure(url: string, kind: SourceKind, query: QueryFn = db.query): Promise<SourceRow | undefined> {
    const key = sourceKey(url);
    if (!key) return undefined;
    // DO UPDATE (to itself) so the existing row comes back from RETURNING.
    const [row] = await query<SourceRow>(
      `INSERT INTO "Source" ("urlKey", "url", "kind") VALUES ($1, $2, $3)
       ON CONFLICT ("urlKey") DO UPDATE SET "urlKey" = EXCLUDED."urlKey"
       RETURNING ${META}`,
      [key, url.trim(), kind],
    );
    return row;
  }

  // Keeps text already fetched for a link (by the scraper, say) so writing
  // its wiki later needs no second fetch. Never overwrites text it has.
  static async rememberText(url: string, kind: SourceKind, text: string, title?: string) {
    const key = sourceKey(url);
    const trimmed = storableText(text).trim();
    if (!key || !trimmed) return;
    await db.query(
      `INSERT INTO "Source" ("urlKey", "url", "kind", "title", "text", "textHash", "utcFetchedDateTime")
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT ("urlKey") DO UPDATE
         SET "text" = EXCLUDED."text", "textHash" = EXCLUDED."textHash", "utcFetchedDateTime" = now(),
             "title" = COALESCE("Source"."title", EXCLUDED."title")
         WHERE "Source"."text" IS NULL`,
      [key, url.trim(), kind, title?.slice(0, 1024) ?? null, trimmed, hashText(trimmed)],
    );
  }

  static async getById(id: number): Promise<(SourceRow & { text: string | null }) | undefined> {
    const [row] = await db.query<SourceRow>(`SELECT ${META}, "text" FROM "Source" WHERE "id" = $1`, [id]);
    return row;
  }

  static async setText(id: number, { text, title }: { text: string; title?: string }) {
    const stored = storableText(text);
    await db.query(
      `UPDATE "Source" SET "text" = $2, "textHash" = $3, "title" = COALESCE($4, "title"), "utcFetchedDateTime" = now() WHERE "id" = $1`,
      [id, stored, hashText(stored), title?.slice(0, 1024) ?? null],
    );
  }

  static async markFailed(id: number, error: string) {
    await db.query(
      `UPDATE "Source" SET "status" = 'failed', "attempts" = "attempts" + 1, "lastError" = $2, "utcAttemptedDateTime" = now()
       WHERE "id" = $1`,
      [id, error.slice(0, 2000)],
    );
  }

  // The API was unavailable: noted, but the source stays as it was and the
  // try does not count.
  static async noteError(id: number, error: string) {
    await db.query(`UPDATE "Source" SET "lastError" = $2, "utcAttemptedDateTime" = now() WHERE "id" = $1`, [id, error.slice(0, 2000)]);
  }

  // The link was read again and its text had not changed: the wiki written
  // from it stands, and counts as checked as of now.
  static async markUnchanged(id: number) {
    await db.query(
      `UPDATE "Source" SET "status" = 'ready', "attempts" = 0, "lastError" = NULL, "utcAttemptedDateTime" = now(), "utcFetchedDateTime" = now()
       WHERE "id" = $1`,
      [id],
    );
  }

  // Queues a source's wiki to be written again (the next refresh of a pin
  // citing it picks it up). Its current wiki stays in use until then.
  static async markPending(id: number) {
    await db.query(`UPDATE "Source" SET "status" = 'pending', "attempts" = 0 WHERE "id" = $1`, [id]);
  }

  // Links no live pin cites, first seen more than olderThanDays ago - a
  // scraped page nobody saved a pin from, or one only deleted pins cited.
  static async orphans(olderThanDays: number) {
    return db.query<{ id: number; url: string; status: string; utcCreatedDateTime: Date }>(
      `SELECT "Source"."id", "Source"."url", "Source"."status", "Source"."utcCreatedDateTime"
       FROM "Source"
       WHERE "Source"."utcCreatedDateTime" < now() - make_interval(days => $1)
         AND NOT EXISTS (
           SELECT 1 FROM "PinSource" JOIN "Pin" ON "Pin"."id" = "PinSource"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
           WHERE "PinSource"."sourceId" = "Source"."id" AND "PinSource"."utcRemovedDateTime" IS NULL)
       ORDER BY "Source"."id"`,
      [olderThanDays],
    );
  }

  static async deleteIds(ids: number[]) {
    if (ids.length) await db.query(`DELETE FROM "Source" WHERE "id" = ANY($1::integer[])`, [ids]);
  }

  // Ready links cited by live pins (pinIds, when given) that are due a
  // re-read by either rule given, least recently read first:
  //   viewed        their pin was viewed since the link was last read
  //                 (PinView is by UTC day), on a day before viewedBefore
  //                 when given - the nightly run covers the day that just
  //                 ended, nothing of the new one
  //   olderThanDays last read more than this many days ago, or never
  // Every read sets utcFetchedDateTime, so either rule's read restarts both.
  static async dueForRecheck({
    viewed,
    olderThanDays,
    pinIds,
    limit,
  }: {
    viewed?: { before?: Date };
    olderThanDays?: number | null;
    pinIds?: number[];
    limit: number;
  }) {
    if (!viewed && olderThanDays == null) return [];
    return db.query<{ id: number; url: string; kind: SourceRow['kind']; textHash: string | null }>(
      `SELECT DISTINCT "Source"."id", "Source"."url", "Source"."kind", "Source"."textHash", "Source"."utcFetchedDateTime"
       FROM "Source"
         JOIN "PinSource" ON "PinSource"."sourceId" = "Source"."id" AND "PinSource"."utcRemovedDateTime" IS NULL
         JOIN "Pin" ON "Pin"."id" = "PinSource"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
       WHERE "Source"."status" = 'ready'
         AND ($2::integer[] IS NULL OR "PinSource"."pinId" = ANY($2::integer[]))
         AND (
           ($4::boolean AND EXISTS (
             SELECT 1 FROM "PinView"
             WHERE "PinView"."pinId" = "PinSource"."pinId"
               AND "PinView"."day" >= (COALESCE("Source"."utcFetchedDateTime", "Source"."utcBuiltDateTime") AT TIME ZONE 'UTC')::date
               AND ($5::timestamptz IS NULL OR "PinView"."day" < ($5::timestamptz AT TIME ZONE 'UTC')::date)))
           OR ($1::integer IS NOT NULL
             AND ("Source"."utcFetchedDateTime" IS NULL OR "Source"."utcFetchedDateTime" < now() - make_interval(days => $1)))
         )
       ORDER BY "Source"."utcFetchedDateTime" NULLS FIRST, "Source"."id"
       LIMIT $3`,
      [olderThanDays ?? null, pinIds ?? null, limit, !!viewed, viewed?.before ?? null],
    );
  }

  // Ready links cited by live pins (pinIds, when given), with the length of
  // the text their wiki was written from.
  static async ready(pinIds?: number[]) {
    return db.query<{ id: number; url: string; wikiVersion: number; textLength: number | null }>(
      `SELECT DISTINCT "Source"."id", "Source"."url", "Source"."wikiVersion", length("Source"."text") AS "textLength"
       FROM "Source"
         JOIN "PinSource" ON "PinSource"."sourceId" = "Source"."id" AND "PinSource"."utcRemovedDateTime" IS NULL
         JOIN "Pin" ON "Pin"."id" = "PinSource"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
       WHERE "Source"."status" = 'ready' AND ($1::integer[] IS NULL OR "PinSource"."pinId" = ANY($1::integer[]))
       ORDER BY "Source"."id"`,
      [pinIds ?? null],
    );
  }

  // Live pins citing any of these sources.
  static async citingPins(sourceIds: number[]): Promise<number[]> {
    if (!sourceIds.length) return [];
    const rows = await db.query<{ pinId: number }>(
      `SELECT DISTINCT "PinSource"."pinId" FROM "PinSource"
         JOIN "Pin" ON "Pin"."id" = "PinSource"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
       WHERE "PinSource"."sourceId" = ANY($1::integer[]) AND "PinSource"."utcRemovedDateTime" IS NULL
       ORDER BY 1`,
      [sourceIds],
    );
    return rows.map((row) => row.pinId);
  }

  // Replaces a source's wiki with a new tree and bumps its version, in one
  // transaction so a reader never sees half of either.
  static async saveWiki(
    id: number,
    root: WikiDraft,
    { title, generatedBy, sourceModifiedDate }: { title?: string | null; generatedBy: string; sourceModifiedDate?: string },
  ): Promise<number> {
    return db.transaction(async (query) => {
      await query(`DELETE FROM "SourceWiki" WHERE "sourceId" = $1`, [id]);
      const insert = async (page: WikiDraft, parentId: number | null, position: number) => {
        const [{ id: pageId }] = await query<{ id: number }>(
          `INSERT INTO "SourceWiki" ("sourceId", "parentId", "position", "type", "title", "summary", "body", "tags")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING "id"`,
          [id, parentId, position, page.type.slice(0, 64), page.title.slice(0, 1024), page.summary.slice(0, 2000), page.body, page.tags],
        );
        for (const [i, child] of (page.children ?? []).entries()) {
          await insert(child, pageId, i);
        }
      };
      await insert(root, null, 0);
      const [{ wikiVersion }] = await query<{ wikiVersion: number }>(
        `UPDATE "Source"
         SET "status" = 'ready', "wikiVersion" = "wikiVersion" + 1, "attempts" = 0, "lastError" = NULL,
             "title" = COALESCE("title", $2), "generatedBy" = $3, "sourceModifiedDate" = $4::date,
             "utcAttemptedDateTime" = now(), "utcBuiltDateTime" = now()
         WHERE "id" = $1 RETURNING "wikiVersion"`,
        [id, title?.slice(0, 1024) ?? null, generatedBy.slice(0, 128), sourceModifiedDate ?? null],
      );
      return wikiVersion;
    });
  }

  // Every page of each source's wiki, as trees keyed by source id.
  static async wikis(sourceIds: number[]): Promise<Map<number, WikiPage>> {
    const roots = new Map<number, WikiPage>();
    if (!sourceIds.length) return roots;
    const rows = await db.query<Omit<WikiPage, 'children'>>(
      `SELECT "id", "sourceId", "parentId", "position", "type", "title", "summary", "body", "tags"
       FROM "SourceWiki" WHERE "sourceId" = ANY($1::integer[]) ORDER BY "position", "id"`,
      [sourceIds],
    );
    for (const root of wikiTrees(rows)) roots.set(root.sourceId, root);
    return roots;
  }

  // Sources waiting on a wiki: pending ones, and failed ones with tries left
  // (or every failed one, when force is set). Only ones some live pin cites.
  static async needingWiki({ pinId, limit = 100, force = false }: { pinId?: number; limit?: number; force?: boolean } = {}) {
    return db.query<{ id: number }>(
      `SELECT DISTINCT "Source"."id"
       FROM "Source"
         JOIN "PinSource" ON "PinSource"."sourceId" = "Source"."id" AND "PinSource"."utcRemovedDateTime" IS NULL
         JOIN "Pin" ON "Pin"."id" = "PinSource"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
       WHERE ("Source"."status" = 'pending' OR ("Source"."status" = 'failed' AND ($3::boolean OR "Source"."attempts" < $4)))
         AND ($1::integer IS NULL OR "PinSource"."pinId" = $1)
       ORDER BY "Source"."id"
       LIMIT $2`,
      [pinId ?? null, limit, force, MAX_ATTEMPTS],
    ).then((rows) => rows.map((row) => row.id));
  }

  static async getAll() {
    const sources = await db.query(`SELECT * FROM "Source" ORDER BY "id"`);
    const wikis = await db.query(`SELECT * FROM "SourceWiki" ORDER BY "id"`);
    const pinSources = await db.query(`SELECT * FROM "PinSource" ORDER BY "pinId", "sourceId"`);
    // okf:lint's findings and scan markers (0027): a contradiction check can
    // be a paid call or an hour's reading, so it is kept too.
    const lintFindings = await db.query(`SELECT * FROM "OkfLintFinding" ORDER BY "id"`);
    const lintScans = await db.query(`SELECT * FROM "OkfLintScan" ORDER BY "check", "subjectId"`);
    return { sources, wikis, pinSources, lintFindings, lintScans };
  }

  // Loads a backup made by getAll, ids intact. Parents precede children in id
  // order, so SourceWiki rows go in as they are.
  static async restore({
    sources = [],
    wikis = [],
    pinSources = [],
    lintFindings = [],
    lintScans = [],
  }: {
    sources?: any[];
    wikis?: any[];
    pinSources?: any[];
    lintFindings?: any[];
    lintScans?: any[];
  }) {
    await db.transaction(async (query) => {
      const insertAll = async (table: string, rows: any[]) => {
        if (!rows.length) return;
        await query(`INSERT INTO "${table}" SELECT * FROM json_populate_recordset(NULL::"${table}", $1::json) ON CONFLICT DO NOTHING`, [
          JSON.stringify(rows),
        ]);
      };
      await insertAll('Source', sources);
      await insertAll('SourceWiki', wikis);
      await insertAll('PinSource', pinSources);
      await insertAll('OkfLintFinding', lintFindings);
      await insertAll('OkfLintScan', lintScans);
      // Identity columns carry on after the restored ids.
      for (const table of ['Source', 'SourceWiki', 'OkfLintFinding']) {
        await query(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), GREATEST((SELECT MAX("id") FROM "${table}"), 1))`);
      }
    });
  }
}

export class PinSource {
  // The links a live pin cites now: its sourceUrl and its references, keyed.
  static async currentLinks(pinId: number): Promise<{ url: string; role: PinSourceRole }[] | undefined> {
    const [pin] = await db.query<{ sourceUrl: string | null }>(
      `SELECT "sourceUrl" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`,
      [pinId],
    );
    if (!pin) return undefined;
    const references = await db.query<{ url: string }>(`SELECT "url" FROM "PinReference" WHERE "pinId" = $1 ORDER BY "id"`, [pinId]);
    return [
      ...(pin.sourceUrl ? [{ url: pin.sourceUrl, role: 'source' as const }] : []),
      ...references.map((r) => ({ url: r.url, role: 'reference' as const })),
    ];
  }

  static async forPin(pinId: number, query: QueryFn = db.query) {
    return query<PinSourceRow & Pick<SourceRow, 'url' | 'kind' | 'title' | 'status' | 'wikiVersion' | 'attempts' | 'lastError' | 'utcBuiltDateTime'>>(
      `SELECT "PinSource"."pinId", "PinSource"."sourceId", "PinSource"."role", "PinSource"."summarizedWikiVersion",
              "PinSource"."utcRemovedDateTime", "Source"."url", "Source"."kind", "Source"."title", "Source"."status",
              "Source"."wikiVersion", "Source"."attempts", "Source"."lastError", "Source"."utcBuiltDateTime"
       FROM "PinSource" JOIN "Source" ON "Source"."id" = "PinSource"."sourceId"
       WHERE "PinSource"."pinId" = $1
       ORDER BY "PinSource"."role" DESC, "PinSource"."utcCreatedDateTime", "PinSource"."sourceId"`,
      [pinId],
    );
  }

  // Brings a pin's rows in line with the links it cites: new links are added,
  // dropped ones marked removed (see utcRemovedDateTime), returning ones
  // restored. On a pin's first sync, when it already has a summary, the links
  // are counted as taken in: the scraper wrote that summary from them.
  static async sync(pinId: number, links: { sourceId: number; role: PinSourceRole }[], { summaryCoversNew }: { summaryCoversNew: boolean }) {
    await db.transaction(async (query) => {
      const existing = await query<{ sourceId: number }>(`SELECT "sourceId" FROM "PinSource" WHERE "pinId" = $1`, [pinId]);
      const firstSync = !existing.length;
      const ids = links.map((l) => l.sourceId);
      await query(
        `UPDATE "PinSource" SET "utcRemovedDateTime" = now()
         WHERE "pinId" = $1 AND "utcRemovedDateTime" IS NULL AND NOT ("sourceId" = ANY($2::integer[]))`,
        [pinId, ids],
      );
      await query(
        `INSERT INTO "PinSource" ("pinId", "sourceId", "role", "summarizedWikiVersion")
         SELECT $1, "l"."sourceId", "l"."role",
                CASE WHEN $4 THEN GREATEST("Source"."wikiVersion", 1) END
         FROM unnest($2::integer[], $3::varchar[]) AS "l" ("sourceId", "role")
           JOIN "Source" ON "Source"."id" = "l"."sourceId"
         ON CONFLICT ("pinId", "sourceId") DO UPDATE SET "role" = EXCLUDED."role", "utcRemovedDateTime" = NULL`,
        [pinId, ids, links.map((l) => l.role), firstSync && summaryCoversNew],
      );
    });
  }

  // Whether the pin's summary is behind its links: one was dropped, or one
  // has a wiki the summary has not taken in yet.
  static async summaryStale(pinId: number): Promise<boolean> {
    const [row] = await db.query<{ stale: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM "PinSource" JOIN "Source" ON "Source"."id" = "PinSource"."sourceId"
         WHERE "PinSource"."pinId" = $1
           AND ("PinSource"."utcRemovedDateTime" IS NOT NULL
             OR ("Source"."wikiVersion" > 0
               AND ("PinSource"."summarizedWikiVersion" IS NULL OR "PinSource"."summarizedWikiVersion" < "Source"."wikiVersion")))
       ) AS "stale"`,
      [pinId],
    );
    return !!row?.stale;
  }

  // After a rebuild: the summary now reflects these versions, and the links
  // the pin dropped are gone.
  static async markSummarized(pinId: number, versions: { sourceId: number; wikiVersion: number }[]) {
    await db.transaction(async (query) => {
      await query(`DELETE FROM "PinSource" WHERE "pinId" = $1 AND "utcRemovedDateTime" IS NOT NULL`, [pinId]);
      await query(
        `UPDATE "PinSource" SET "summarizedWikiVersion" = "v"."wikiVersion"
         FROM unnest($2::integer[], $3::integer[]) AS "v" ("sourceId", "wikiVersion")
         WHERE "PinSource"."pinId" = $1 AND "PinSource"."sourceId" = "v"."sourceId"`,
        [pinId, versions.map((v) => v.sourceId), versions.map((v) => v.wikiVersion)],
      );
    });
  }

  // Live pins whose summaries are behind their links, for the catch-up job.
  static async staleSummaryPinIds(limit = 100): Promise<number[]> {
    const rows = await db.query<{ pinId: number }>(
      `SELECT DISTINCT "PinSource"."pinId"
       FROM "PinSource"
         JOIN "Source" ON "Source"."id" = "PinSource"."sourceId"
         JOIN "Pin" ON "Pin"."id" = "PinSource"."pinId" AND "Pin"."utcDeletedDateTime" IS NULL
       WHERE "PinSource"."utcRemovedDateTime" IS NOT NULL
          OR ("Source"."wikiVersion" > 0
            AND ("PinSource"."summarizedWikiVersion" IS NULL OR "PinSource"."summarizedWikiVersion" < "Source"."wikiVersion"))
       ORDER BY "PinSource"."pinId"
       LIMIT $1`,
      [limit],
    );
    return rows.map((row) => row.pinId);
  }
}

// Flat SourceWiki rows as one tree per source, children in position order.
export function wikiTrees(rows: Omit<WikiPage, 'children'>[]): WikiPage[] {
  const pages = new Map(rows.map((row) => [row.id, { ...row, children: [] as WikiPage[] }]));
  const roots: WikiPage[] = [];
  for (const page of pages.values()) {
    const parent = page.parentId == null ? undefined : pages.get(page.parentId);
    if (parent) parent.children.push(page);
    else if (page.parentId == null) roots.push(page);
  }
  const sort = (list: WikiPage[]) => {
    list.sort((a, b) => a.position - b.position || a.id - b.id);
    list.forEach((page) => sort(page.children));
  };
  sort(roots);
  return roots;
}
