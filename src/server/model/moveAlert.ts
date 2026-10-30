import * as db from '../db';
import type { MoveAlertRow, MoveBaseline, MoveKind } from '@/lib/moveAlerts';
import type { MarketRef } from '@/lib/predictionMarkets';

// Premium price and odds alerts (0236): one row per reader and market or
// stock. Soft delete + revive, as Follow.
export type DueAlert = { id: number; userId: number; kind: MoveKind; subject: string; label: string; pinId: number | null; threshold: number; baseline: MoveBaseline | null; ref: MarketRef | null };

const ROW = `a."id", a."kind", a."subject", a."label", a."pinId", p."title" AS "pinTitle", a."threshold"::float8 AS "threshold"`;

export default class MoveAlert {
  static list(userId: number, pinId?: number | null): Promise<MoveAlertRow[]> {
    return db.query<MoveAlertRow>(
      `SELECT ${ROW} FROM "MoveAlert" a LEFT JOIN "Pin" p ON p."id" = a."pinId"
       WHERE a."userId" = $1 AND a."utcDeletedDateTime" IS NULL AND ($2::int IS NULL OR a."pinId" = $2)
       ORDER BY a."utcCreatedDateTime" DESC, a."id" DESC`,
      [userId, pinId ?? null],
    );
  }

  static async count(userId: number): Promise<number> {
    const [row] = await db.query<{ n: number }>(`SELECT count(*)::int AS "n" FROM "MoveAlert" WHERE "userId" = $1 AND "utcDeletedDateTime" IS NULL`, [userId]);
    return row.n;
  }

  // Turns the alert on, or changes its size and starts it over from the
  // baseline just read (a revived alert is a new one).
  static async set(
    userId: number,
    a: { kind: MoveKind; subject: string; label: string; ref: MarketRef | null; pinId: number; threshold: number; baseline: MoveBaseline | null },
  ): Promise<MoveAlertRow> {
    const [row] = await db.query<{ id: number }>(
      `INSERT INTO "MoveAlert" ("userId", "kind", "subject", "label", "ref", "pinId", "threshold", "baseline")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT ON CONSTRAINT "UC_MoveAlert_subject" DO UPDATE SET
         "label" = EXCLUDED."label", "ref" = EXCLUDED."ref", "pinId" = EXCLUDED."pinId", "threshold" = EXCLUDED."threshold",
         "baseline" = EXCLUDED."baseline", "utcDeletedDateTime" = NULL
       RETURNING "id"`,
      [userId, a.kind, a.subject, a.label.slice(0, 300), a.ref ? JSON.stringify(a.ref) : null, a.pinId, a.threshold, a.baseline ? JSON.stringify(a.baseline) : null],
    );
    const [saved] = await db.query<MoveAlertRow>(`SELECT ${ROW} FROM "MoveAlert" a LEFT JOIN "Pin" p ON p."id" = a."pinId" WHERE a."id" = $1`, [row.id]);
    return saved;
  }

  static async remove(userId: number, id: number): Promise<boolean> {
    const rows = await db.query(`UPDATE "MoveAlert" SET "utcDeletedDateTime" = now() WHERE "id" = $1 AND "userId" = $2 AND "utcDeletedDateTime" IS NULL RETURNING "id"`, [id, userId]);
    return rows.length > 0;
  }

  // Every live alert, for the timer.
  static live(): Promise<DueAlert[]> {
    return db.query<DueAlert>(
      `SELECT a."id", a."userId", a."kind", a."subject", a."label", a."pinId", a."threshold"::float8 AS "threshold", a."baseline", a."ref"
       FROM "MoveAlert" a JOIN "User" u ON u."id" = a."userId" AND u."utcDeletedDateTime" IS NULL
       WHERE a."utcDeletedDateTime" IS NULL ORDER BY a."id"`,
    );
  }

  // Moves the baseline on without telling anyone (first read, new outcomes).
  static async rebase(id: number, baseline: MoveBaseline) {
    await db.query(`UPDATE "MoveAlert" SET "baseline" = $2 WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [id, JSON.stringify(baseline)]);
  }

  // Claims a move: succeeds for one caller only, the one that still sees the
  // baseline it measured from. The winner tells the reader.
  static async claim(id: number, from: MoveBaseline | null, to: MoveBaseline): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "MoveAlert" SET "baseline" = $3, "utcLastAlertDateTime" = now()
       WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL AND "baseline" IS NOT DISTINCT FROM $2::jsonb RETURNING "id"`,
      [id, from ? JSON.stringify(from) : null, JSON.stringify(to)],
    );
    return rows.length > 0;
  }
}
