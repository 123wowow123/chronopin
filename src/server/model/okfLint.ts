import * as db from '../db';

// okf:lint's findings and scan markers (0027_okf_lint.sql).

export type LintCheck = 'conformance' | 'stale' | 'orphan' | 'quality' | 'contradiction' | 'imprecise' | 'cluster';
export type LintSeverity = 'error' | 'warning' | 'info';

export type LintFinding = {
  check: LintCheck;
  severity: LintSeverity;
  pinId?: number | null;
  sourceId?: number | null;
  path?: string | null;
  message: string;
  detail?: unknown;
};

export default class OkfLint {
  // Swaps the open findings of one check for new ones. With pinIds, only
  // findings about those pins (and, when sourceIds is given, those sources)
  // are replaced, so a --pin run leaves the rest of the table alone.
  static async replace(check: LintCheck, findings: LintFinding[], scope?: { pinIds?: number[]; sourceIds?: number[] }) {
    await db.transaction(async (query) => {
      if (scope) {
        await query(
          `DELETE FROM "OkfLintFinding" WHERE "check" = $1
             AND ("pinId" = ANY($2::integer[]) OR "sourceId" = ANY($3::integer[]))`,
          [check, scope.pinIds ?? [], scope.sourceIds ?? []],
        );
      } else {
        await query(`DELETE FROM "OkfLintFinding" WHERE "check" = $1`, [check]);
      }
      if (!findings.length) return;
      await query(
        `INSERT INTO "OkfLintFinding" ("check", "severity", "pinId", "sourceId", "path", "message", "detail")
         SELECT "check", "severity", "pinId", "sourceId", "path", "message", "detail"
         FROM json_populate_recordset(NULL::"OkfLintFinding", $1::json)`,
        [JSON.stringify(findings.map((f) => ({ ...f, detail: f.detail ?? null, message: f.message.slice(0, 2000), path: f.path?.slice(0, 1024) ?? null })))],
      );
    });
  }

  // Findings about a pin and the links it cites, for the admin source view.
  static async forPin(pinId: number) {
    return db.query(
      `SELECT "id", "check", "severity", "pinId", "sourceId", "path", "message", "detail", "utcCreatedDateTime"
       FROM "OkfLintFinding"
       WHERE "pinId" = $1
          OR "sourceId" IN (SELECT "sourceId" FROM "PinSource" WHERE "pinId" = $1 AND "utcRemovedDateTime" IS NULL)
       ORDER BY CASE "severity" WHEN 'error' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, "id"`,
      [pinId],
    );
  }

  // How many findings each check holds, by severity, for the admin overview.
  static async summary() {
    return db.query<{ check: LintCheck; severity: LintSeverity; findings: number; pins: number }>(
      `SELECT "check", "severity", COUNT(*)::int AS "findings", COUNT(DISTINCT "pinId")::int AS "pins"
       FROM "OkfLintFinding"
       GROUP BY 1, 2
       ORDER BY CASE "severity" WHEN 'error' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, 1`,
    );
  }

  // Open findings for the admin list, worst first, with the pin they are about.
  // Without a filter this is every finding, so it takes a limit.
  static async list({ check, severity, limit = 200 }: { check?: LintCheck; severity?: LintSeverity; limit?: number } = {}) {
    return db.query<{
      id: number; check: LintCheck; severity: LintSeverity; pinId: number | null;
      message: string; title: string | null; userName: string | null; day: string | null;
    }>(
      `SELECT f."id", f."check", f."severity", f."pinId", f."message",
              p."title", u."userName", to_char(p."utcStartDateTime", 'YYYY-MM-DD') AS "day"
       FROM "OkfLintFinding" f
         LEFT JOIN "Pin" p ON p."id" = f."pinId"
         LEFT JOIN "User" u ON u."id" = p."userId"
       WHERE ($1::text IS NULL OR f."check" = $1)
         AND ($2::text IS NULL OR f."severity" = $2)
       ORDER BY CASE f."severity" WHEN 'error' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END, f."check", f."pinId"
       LIMIT $3`,
      [check ?? null, severity ?? null, limit],
    );
  }

  static async scanned(check: string, subjectId: number): Promise<string | undefined> {
    const [row] = await db.query<{ signature: string }>(`SELECT "signature" FROM "OkfLintScan" WHERE "check" = $1 AND "subjectId" = $2`, [check, subjectId]);
    return row?.signature;
  }

  static async markScanned(check: string, subjectId: number, signature: string) {
    await db.query(
      `INSERT INTO "OkfLintScan" ("check", "subjectId", "signature") VALUES ($1, $2, $3)
       ON CONFLICT ("check", "subjectId") DO UPDATE SET "signature" = EXCLUDED."signature", "utcScannedDateTime" = now()`,
      [check, subjectId, signature],
    );
  }
}
