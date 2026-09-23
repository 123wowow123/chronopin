import * as db from '../db';

// A pin marked to be looked at again (schema 0067): by an admin from the
// pin's page, or by a daily job that found something it could not fix. The
// midnight job works the open ones (docs/okf/scraping/daily-jobs.md).

export type PinRevisitRow = {
  id: number;
  pinId: number;
  reason: string;
  markedBy: number | null;
  jobRunId: number | null;
  resolution: string | null;
  utcCreatedDateTime: Date;
  utcResolvedDateTime: Date | null;
};

export default class PinRevisit {
  // Marks a pin, or adds the reason to its open mark. Returns the mark's id.
  static async mark(pinId: number, reason: string, by: { userId?: number | null; jobRunId?: number | null }): Promise<number> {
    const text = reason.trim().slice(0, 1000);
    const rows = await db.query<{ id: number }>(
      `
      INSERT INTO "PinRevisit" ("pinId", "reason", "markedBy", "jobRunId")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("pinId") WHERE "utcResolvedDateTime" IS NULL
      DO UPDATE SET "reason" = left("PinRevisit"."reason" || E'\\n' || EXCLUDED."reason", 1000)
      RETURNING "id"`,
      [pinId, text, by.userId ?? null, by.jobRunId ?? null],
    );
    return rows[0].id;
  }

  static async resolve(pinId: number, resolution: string, jobRunId: number | null = null): Promise<boolean> {
    const rows = await db.query(
      `
      UPDATE "PinRevisit" SET "resolution" = $2, "utcResolvedDateTime" = now(), "jobRunId" = COALESCE($3, "jobRunId")
      WHERE "pinId" = $1 AND "utcResolvedDateTime" IS NULL
      RETURNING "id"`,
      [pinId, resolution.trim().slice(0, 2000), jobRunId],
    );
    return rows.length > 0;
  }

  static async openFor(pinId: number): Promise<PinRevisitRow | null> {
    const rows = await db.query<PinRevisitRow>(`SELECT * FROM "PinRevisit" WHERE "pinId" = $1 AND "utcResolvedDateTime" IS NULL`, [pinId]);
    return rows[0] ?? null;
  }

  // The open marks, oldest first, with enough of each pin to start on it.
  static listOpen(limit: number) {
    return db.query<{ pinId: number; title: string; reason: string; marked: Date; sourceUrl: string | null; utcStartDateTime: Date; dateConfidence: string | null; author: string | null }>(
      `
      SELECT "r"."pinId", "p"."title", "r"."reason", "r"."utcCreatedDateTime" AS "marked", "p"."sourceUrl", "p"."utcStartDateTime", "p"."dateConfidence",
        "u"."userName" AS "author"
      FROM "PinRevisit" AS "r"
        JOIN "Pin" AS "p" ON "p"."id" = "r"."pinId" AND "p"."utcDeletedDateTime" IS NULL
        LEFT JOIN "User" AS "u" ON "u"."id" = "p"."userId"
      WHERE "r"."utcResolvedDateTime" IS NULL
      ORDER BY "r"."utcCreatedDateTime"
      LIMIT $1`,
      [limit],
    );
  }

  static async countOpen(): Promise<number> {
    const rows = await db.query<{ n: number }>(`SELECT count(*)::int AS "n" FROM "PinRevisit" WHERE "utcResolvedDateTime" IS NULL`);
    return rows[0].n;
  }
}
