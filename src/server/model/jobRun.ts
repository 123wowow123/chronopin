import * as db from '../db';

// One run of a daily pin job (schema 0067, src/server/jobs).

export type JobStatus = 'running' | 'ok' | 'failed' | 'skipped';
export type JobDriver = 'api' | 'session';
export type JobAction = { at: string; tool: string; pinId?: number; title?: string; detail: string };
export type JobLearning = { at: string; topic: string; text: string };

export type JobRunRow = {
  id: number;
  jobId: string;
  slot: string;
  trigger: 'schedule' | 'manual';
  status: JobStatus;
  driver: JobDriver | null;
  tasks: string[];
  actions: JobAction[];
  learnings: JobLearning[];
  report: string | null;
  error: string | null;
  usage: Record<string, unknown> | null;
  userId: number | null;
  utcStartedDateTime: Date;
  utcFinishedDateTime: Date | null;
};

// A run longer than this is taken to have died with its server.
export const MAX_RUN_MS = 3 * 60 * 60 * 1000;

const COLUMNS = `"id", "jobId", "slot", "trigger", "status", "driver", "tasks", "actions", "learnings", "report", "error", "usage", "userId", "utcStartedDateTime", "utcFinishedDateTime"`;

export default class JobRun {
  // Claims a slot: the new run's id for exactly one caller, null for the rest.
  static async claim(run: { jobId: string; slot: string; trigger: 'schedule' | 'manual'; tasks: string[]; userId: number | null }) {
    const rows = await db.query<{ id: number }>(
      `
      INSERT INTO "JobRun" ("jobId", "slot", "trigger", "tasks", "userId")
      VALUES ($1, $2, $3, $4::jsonb, $5)
      ON CONFLICT ("jobId", "slot") DO NOTHING
      RETURNING "id"`,
      [run.jobId, run.slot, run.trigger, JSON.stringify(run.tasks), run.userId],
    );
    return rows[0]?.id ?? null;
  }

  // Runs that died with their server are closed as failed, so they neither
  // block the next run nor show as running for ever.
  static async closeAbandoned() {
    await db.query(
      `
      UPDATE "JobRun" SET "status" = 'failed', "error" = 'The run stopped without finishing (its server went away).', "utcFinishedDateTime" = now()
      WHERE "status" = 'running' AND "utcStartedDateTime" < now() - make_interval(secs => $1)`,
      [MAX_RUN_MS / 1000],
    );
  }

  static async anyRunning(): Promise<boolean> {
    const rows = await db.query(`SELECT 1 FROM "JobRun" WHERE "status" = 'running' LIMIT 1`);
    return rows.length > 0;
  }

  static async setDriver(id: number, driver: JobDriver) {
    await db.query(`UPDATE "JobRun" SET "driver" = $2 WHERE "id" = $1`, [id, driver]);
  }

  static async addAction(id: number, action: JobAction) {
    await db.query(`UPDATE "JobRun" SET "actions" = "actions" || $2::jsonb WHERE "id" = $1`, [id, JSON.stringify([action])]);
  }

  static async addLearning(id: number, learning: JobLearning) {
    await db.query(`UPDATE "JobRun" SET "learnings" = "learnings" || $2::jsonb WHERE "id" = $1`, [id, JSON.stringify([learning])]);
  }

  static async finish(id: number, result: { status: Exclude<JobStatus, 'running'>; report?: string | null; error?: string | null; usage?: Record<string, unknown> | null }) {
    await db.query(
      `UPDATE "JobRun" SET "status" = $2, "report" = $3, "error" = $4, "usage" = $5::jsonb, "utcFinishedDateTime" = now() WHERE "id" = $1`,
      [id, result.status, result.report ?? null, result.error?.slice(0, 4000) ?? null, result.usage ? JSON.stringify(result.usage) : null],
    );
  }

  static async get(id: number): Promise<JobRunRow | null> {
    const rows = await db.query<JobRunRow>(`SELECT ${COLUMNS} FROM "JobRun" WHERE "id" = $1`, [id]);
    return rows[0] ?? null;
  }

  static list(limit = 30): Promise<JobRunRow[]> {
    return db.query<JobRunRow>(`SELECT ${COLUMNS} FROM "JobRun" ORDER BY "utcStartedDateTime" DESC, "id" DESC LIMIT $1`, [limit]);
  }

  // When the job last finished a run, so a run can ask for what is new since
  // then; null before its first.
  static async lastFinished(jobId: string): Promise<Date | null> {
    const rows = await db.query<{ at: Date }>(
      `SELECT max("utcFinishedDateTime") AS "at" FROM "JobRun" WHERE "jobId" = $1 AND "status" = 'ok'`,
      [jobId],
    );
    return rows[0]?.at ? new Date(rows[0].at) : null;
  }

  // What the runs have learned, newest first, for the next run's prompt.
  static recentLearnings(limit: number): Promise<(JobLearning & { runId: number; jobId: string })[]> {
    return db.query(
      `
      SELECT "r"."id" AS "runId", "r"."jobId", "l"."at", "l"."topic", "l"."text"
      FROM "JobRun" AS "r", jsonb_to_recordset("r"."learnings") AS "l"("at" text, "topic" text, "text" text)
      ORDER BY "l"."at" DESC
      LIMIT $1`,
      [limit],
    );
  }
}
