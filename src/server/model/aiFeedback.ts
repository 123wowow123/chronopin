import * as db from '../db';
import type { Row } from '../db';
import { AI_FEEDBACK_MAX } from '@/lib/duplicateDraft';

// Failed reviews (the call went through but gave nothing usable) after which
// `npm run suggestions:review` leaves a suggestion alone unless told to retry.
export const MAX_REVIEW_ATTEMPTS = 3;

// How many suggestions one person may leave in a day: each is a web-searching
// Claude call.
export const DAILY_LIMIT = 10;

// What one person sees of their own suggestion on a pin.
const PUBLIC_COLUMNS = `"id", "pinId", "feedback", "sourceUrl", "status", "aiVerdict", "aiReasoning", "aiReferences", "utcCreatedDateTime", "utcResolvedDateTime"`;

// What someone says an existing pin is missing or getting wrong, for the AI to
// check (see 0015 and 0064): left from the duplicate prompt, or from the pin's
// own page.
export default class AiFeedback {
  // Why this feedback cannot be saved, if it cannot.
  static problem(feedback: unknown, sourceUrl: unknown): string | undefined {
    if (typeof feedback !== 'string' || !feedback.trim()) {
      return 'Say what the pin is missing.';
    }
    if (feedback.trim().length > AI_FEEDBACK_MAX) {
      return `Feedback must be at most ${AI_FEEDBACK_MAX} characters.`;
    }
    if (sourceUrl != null && sourceUrl !== '' && (typeof sourceUrl !== 'string' || !/^https?:\/\//i.test(sourceUrl) || sourceUrl.length > 4000)) {
      return 'The source URL must be an http(s) link.';
    }
    return undefined;
  }

  static async create({ pinId, userId, feedback, sourceUrl }: { pinId: number; userId: number; feedback: string; sourceUrl?: string | null }) {
    const [row] = await db.query<{ id: number; utcCreatedDateTime: Date }>(
      `INSERT INTO "AiFeedback" ("pinId", "userId", "feedback", "sourceUrl")
       VALUES ($1, $2, $3, $4)
       RETURNING "id", "utcCreatedDateTime"`,
      [pinId, userId, feedback.trim(), sourceUrl?.trim() || null],
    );
    return row;
  }

  static async byId(id: number): Promise<Row | undefined> {
    const [row] = await db.query(`SELECT * FROM "AiFeedback" WHERE "id" = $1`, [id]);
    return row;
  }

  // One person's suggestions on one pin, newest first.
  static forPinAndUser(pinId: number, userId: number): Promise<Row[]> {
    return db.query(`SELECT ${PUBLIC_COLUMNS} FROM "AiFeedback" WHERE "pinId" = $1 AND "userId" = $2 ORDER BY "id" DESC`, [pinId, userId]);
  }

  // How many suggestions this person left in the last day.
  static async countToday(userId: number): Promise<number> {
    const [row] = await db.query<{ count: number }>(
      `SELECT count(*)::int AS "count" FROM "AiFeedback" WHERE "userId" = $1 AND "utcCreatedDateTime" > now() - interval '1 day'`,
      [userId],
    );
    return row?.count ?? 0;
  }

  // Suggestions still waiting on a review, oldest first.
  static async openIds({ limit, retryFailed = false }: { limit: number; retryFailed?: boolean }): Promise<number[]> {
    const rows = await db.query<{ id: number }>(
      `SELECT "id" FROM "AiFeedback"
       WHERE "status" = 'open' AND ($2 OR "reviewAttempts" < $3)
       ORDER BY "id"
       LIMIT $1`,
      [limit, retryFailed, MAX_REVIEW_ATTEMPTS],
    );
    return rows.map((row) => row.id);
  }

  // The finished review: 'applied' when it added references, else 'dismissed'.
  static async recordReview(
    id: number,
    review: { verdict: string; reasoning: string; model: string; references: { url: string; title?: string; confidence: number }[] },
  ) {
    const added = review.references.map(({ url, title, confidence }) => ({ url, title: title ?? null, confidence }));
    await db.query(
      `UPDATE "AiFeedback"
       SET "status" = $2, "aiVerdict" = $3, "aiReasoning" = $4, "aiReferences" = $5::jsonb, "aiModel" = $6, "utcResolvedDateTime" = now()
       WHERE "id" = $1`,
      [id, added.length ? 'applied' : 'dismissed', review.verdict, review.reasoning || null, JSON.stringify(added), review.model],
    );
  }

  // A review that went through but gave nothing usable: counted, left open.
  static async recordFailure(id: number) {
    await db.query(`UPDATE "AiFeedback" SET "reviewAttempts" = "reviewAttempts" + 1 WHERE "id" = $1`, [id]);
  }

  // For backups: every row, oldest first.
  static getAll(): Promise<Row[]> {
    return db.query(`
      SELECT "id", "pinId", "userId", "feedback", "sourceUrl", "status", "aiVerdict", "aiReasoning", "aiReferences", "aiModel", "reviewAttempts", "utcCreatedDateTime", "utcResolvedDateTime"
      FROM "AiFeedback"
      ORDER BY "id"`);
  }

  static async restore(rows: Row[] | undefined) {
    for (const row of rows || []) {
      await db.query(
        `INSERT INTO "AiFeedback" ("id", "pinId", "userId", "feedback", "sourceUrl", "status", "aiVerdict", "aiReasoning", "aiReferences", "aiModel", "reviewAttempts", "utcCreatedDateTime", "utcResolvedDateTime")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, COALESCE($12, now()), $13)
         ON CONFLICT ("id") DO NOTHING`,
        [
          row.id,
          row.pinId,
          row.userId ?? null,
          row.feedback,
          row.sourceUrl ?? null,
          row.status ?? 'open',
          row.aiVerdict ?? null,
          row.aiReasoning ?? null,
          row.aiReferences == null ? null : JSON.stringify(row.aiReferences),
          row.aiModel ?? null,
          row.reviewAttempts ?? 0,
          row.utcCreatedDateTime ?? null,
          row.utcResolvedDateTime ?? null,
        ],
      );
    }
    // Explicit ids do not advance the identity sequence.
    await db.query(`SELECT setval(pg_get_serial_sequence('"AiFeedback"', 'id'), COALESCE((SELECT MAX("id") FROM "AiFeedback"), 0) + 1, false)`);
  }
}
