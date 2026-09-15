import * as db from '../db';
import type { Row } from '../db';
import { AI_FEEDBACK_MAX } from '@/lib/duplicateDraft';

// What someone says an existing pin is missing, for the AI to act on (see 0015).
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

  // For backups: every row, oldest first.
  static getAll(): Promise<Row[]> {
    return db.query(`
      SELECT "id", "pinId", "userId", "feedback", "sourceUrl", "status", "utcCreatedDateTime", "utcResolvedDateTime"
      FROM "AiFeedback"
      ORDER BY "id"`);
  }

  static async restore(rows: Row[] | undefined) {
    for (const row of rows || []) {
      await db.query(
        `INSERT INTO "AiFeedback" ("id", "pinId", "userId", "feedback", "sourceUrl", "status", "utcCreatedDateTime", "utcResolvedDateTime")
         VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8)
         ON CONFLICT ("id") DO NOTHING`,
        [row.id, row.pinId, row.userId ?? null, row.feedback, row.sourceUrl ?? null, row.status ?? 'open', row.utcCreatedDateTime ?? null, row.utcResolvedDateTime ?? null],
      );
    }
    // Explicit ids do not advance the identity sequence.
    await db.query(`SELECT setval(pg_get_serial_sequence('"AiFeedback"', 'id'), COALESCE((SELECT MAX("id") FROM "AiFeedback"), 0) + 1, false)`);
  }
}
