import * as db from '../db';
import { MAX_LABEL_LENGTH, MAX_QUERY_LENGTH, normalizeQuery, type SearchAlertRow } from '@/lib/searchAlerts';

// Saved searches with alerts (0237). Soft delete, as Follow and MoveAlert.
export type DueAlert = { id: number; userId: number; query: string; notifyBell: boolean; since: Date };

const ROW = `s."id", s."query", s."label", s."notifyBell", s."notifyDigest"`;

export default class SearchAlert {
  static list(userId: number): Promise<SearchAlertRow[]> {
    return db.query<SearchAlertRow>(
      `SELECT ${ROW} FROM "SearchAlert" s WHERE s."userId" = $1 AND s."utcDeletedDateTime" IS NULL ORDER BY s."utcCreatedDateTime" DESC, s."id" DESC`,
      [userId],
    );
  }

  static async count(userId: number): Promise<number> {
    const [row] = await db.query<{ n: number }>(`SELECT count(*)::int AS "n" FROM "SearchAlert" WHERE "userId" = $1 AND "utcDeletedDateTime" IS NULL`, [userId]);
    return row.n;
  }

  static async findByQuery(userId: number, query: string): Promise<SearchAlertRow | null> {
    const rows = await db.query<SearchAlertRow>(
      `SELECT ${ROW} FROM "SearchAlert" s WHERE s."userId" = $1 AND s."utcDeletedDateTime" IS NULL AND lower(btrim(s."query")) = lower($2)`,
      [userId, normalizeQuery(query)],
    );
    return rows[0] ?? null;
  }

  // Saves a search, or updates the name and switches of the one the reader
  // already has for this query. Matching starts from now: pins that were
  // already there are what the search page shows.
  static async save(userId: number, a: { query: string; label: string | null; notifyBell: boolean; notifyDigest: boolean }): Promise<SearchAlertRow> {
    const query = normalizeQuery(a.query).slice(0, MAX_QUERY_LENGTH);
    const label = a.label?.trim().slice(0, MAX_LABEL_LENGTH) || null;
    const existing = await SearchAlert.findByQuery(userId, query);
    if (existing) {
      const [row] = await db.query<SearchAlertRow>(
        `UPDATE "SearchAlert" s SET "label" = $2, "notifyBell" = $3, "notifyDigest" = $4 WHERE s."id" = $1 RETURNING ${ROW}`,
        [existing.id, label, a.notifyBell, a.notifyDigest],
      );
      return row;
    }
    const [row] = await db.query<SearchAlertRow>(
      // The watermark is set from JavaScript's clock, in milliseconds, so the
      // timer's claim on it compares exactly.
      `INSERT INTO "SearchAlert" ("userId", "query", "label", "notifyBell", "notifyDigest", "utcLastCheckedDateTime") VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING "id", "query", "label", "notifyBell", "notifyDigest"`,
      [userId, query, label, a.notifyBell, a.notifyDigest, new Date()],
    );
    return row;
  }

  static async update(userId: number, id: number, a: { label?: string | null; notifyBell?: boolean; notifyDigest?: boolean }): Promise<SearchAlertRow | null> {
    const rows = await db.query<SearchAlertRow>(
      `UPDATE "SearchAlert" s SET
         "label" = CASE WHEN $3::boolean THEN $4 ELSE s."label" END,
         "notifyBell" = COALESCE($5, s."notifyBell"), "notifyDigest" = COALESCE($6, s."notifyDigest")
       WHERE s."id" = $1 AND s."userId" = $2 AND s."utcDeletedDateTime" IS NULL RETURNING ${ROW}`,
      [id, userId, a.label !== undefined, a.label?.trim().slice(0, MAX_LABEL_LENGTH) || null, a.notifyBell ?? null, a.notifyDigest ?? null],
    );
    return rows[0] ?? null;
  }

  static async remove(userId: number, id: number): Promise<boolean> {
    const rows = await db.query(`UPDATE "SearchAlert" SET "utcDeletedDateTime" = now() WHERE "id" = $1 AND "userId" = $2 AND "utcDeletedDateTime" IS NULL RETURNING "id"`, [id, userId]);
    return rows.length > 0;
  }

  // The searches that have gone longest unchecked, for the timer. Readers who
  // switched both alerts off are skipped: nothing would come of the matches.
  static due(limit: number): Promise<DueAlert[]> {
    return db.query<DueAlert>(
      `SELECT s."id", s."userId", s."query", s."notifyBell", s."utcLastCheckedDateTime" AS "since"
       FROM "SearchAlert" s JOIN "User" u ON u."id" = s."userId" AND u."utcDeletedDateTime" IS NULL
       WHERE s."utcDeletedDateTime" IS NULL AND (s."notifyBell" OR s."notifyDigest")
       ORDER BY s."utcLastCheckedDateTime", s."id" LIMIT $1`,
      [limit],
    );
  }

  // Moves the watermark on, but only from the value the caller read: the one
  // server that wins the claim records the matches. Compared to the
  // millisecond, which is all a JavaScript Date keeps.
  static async claim(id: number, from: Date, to: Date): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "SearchAlert" SET "utcLastCheckedDateTime" = $3 WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL AND abs(extract(epoch FROM "utcLastCheckedDateTime" - $2::timestamptz)) < 0.002 RETURNING "id"`,
      [id, from, to],
    );
    return rows.length > 0;
  }

  // Records the pins a search matched (visible ones only) and answers with the
  // pins not recorded before, each with its author, for the notification.
  static async recordMatches(id: number, pinIds: number[]): Promise<{ pinId: number; authorId: number }[]> {
    if (!pinIds.length) return [];
    return db.query<{ pinId: number; authorId: number }>(
      `INSERT INTO "SearchAlertMatch" ("searchAlertId", "pinId")
       SELECT $1, p."id" FROM "Pin" p WHERE p."id" = ANY($2::int[]) AND p."utcDeletedDateTime" IS NULL
       ON CONFLICT DO NOTHING
       RETURNING "pinId", (SELECT p."userId" FROM "Pin" p WHERE p."id" = "pinId") AS "authorId"`,
      [id, pinIds],
    );
  }

  // New matches of the last week for each of a reader's digest searches.
  static async digestMatches(userId: number, since: Date, perSearch = 5): Promise<{ id: number; name: string; query: string; total: number; pins: { id: number; title: string }[] }[]> {
    const rows = await db.query<{ id: number; name: string; query: string; total: number; pins: { id: number; title: string }[] }>(
      `SELECT s."id", COALESCE(NULLIF(btrim(s."label"), ''), s."query") AS "name", s."query", m."total", m."pins"
       FROM "SearchAlert" s
       JOIN LATERAL (
         SELECT count(*)::int AS "total",
                COALESCE(jsonb_agg(jsonb_build_object('id', x."id", 'title', x."title") ORDER BY x."at" DESC) FILTER (WHERE x."rn" <= $3), '[]'::jsonb) AS "pins"
         FROM (SELECT p."id", p."title", m."utcCreatedDateTime" AS "at", row_number() OVER (ORDER BY m."utcCreatedDateTime" DESC) AS "rn"
               FROM "SearchAlertMatch" m JOIN "Pin" p ON p."id" = m."pinId" AND p."utcDeletedDateTime" IS NULL
               WHERE m."searchAlertId" = s."id" AND m."utcCreatedDateTime" >= $2) x
       ) m ON m."total" > 0
       WHERE s."userId" = $1 AND s."utcDeletedDateTime" IS NULL AND s."notifyDigest"
       ORDER BY m."total" DESC, s."id"`,
      [userId, since, perSearch],
    );
    return rows;
  }
}
