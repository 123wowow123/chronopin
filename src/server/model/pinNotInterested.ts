import * as db from '../db';
import type { Row } from '../db';

// Pins a reader said they are not interested in (0077). Static queries, as
// Follow's are.
export default class PinNotInterested {
  // Resolves { changed } (false when it was already marked), or null when
  // there is no such live pin.
  static async mark(userId: number, pinId: number) {
    const [pin] = await db.query(`SELECT "id" FROM "Pin" WHERE "id" = $1 AND "utcDeletedDateTime" IS NULL`, [pinId]);
    if (!pin) return null;
    const rows = await db.query(`INSERT INTO "PinNotInterested" ("userId", "pinId") VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING "pinId"`, [
      userId,
      pinId,
    ]);
    return { changed: rows.length > 0 };
  }

  static async unmark(userId: number, pinId: number) {
    const rows = await db.query(`DELETE FROM "PinNotInterested" WHERE "userId" = $1 AND "pinId" = $2 RETURNING "pinId"`, [userId, pinId]);
    return { changed: rows.length > 0 };
  }

  // The reader's pin ids, for what the timeline and search leave out.
  static async pinIds(userId: number): Promise<number[]> {
    const rows = await db.query<{ pinId: number }>(`SELECT "pinId" FROM "PinNotInterested" WHERE "userId" = $1`, [userId]);
    return rows.map((row) => row.pinId);
  }

  // Every mark, for backups (scripts/data).
  static getAll() {
    return db.query(`SELECT "userId", "pinId", "utcCreatedDateTime" FROM "PinNotInterested" ORDER BY "utcCreatedDateTime", "userId", "pinId"`);
  }

  static async restore(marks: Row[] | undefined) {
    for (const mark of marks || []) {
      await db.query(
        `INSERT INTO "PinNotInterested" ("userId", "pinId", "utcCreatedDateTime") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [mark.userId, mark.pinId, mark.utcCreatedDateTime],
      );
    }
  }
}
