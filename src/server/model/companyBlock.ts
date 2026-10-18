import * as db from '../db';
import type { Row } from '../db';

export type BlockedCompany = { id: number; name: string; logoUrl: string | null; utcCreatedDateTime: Date };

// Companies a reader blocked (0078). Static queries, as CompanyFollow's are.
export default class CompanyBlock {
  // Blocks, and ends a follow of the company. Resolves { changed }: false
  // when it was already blocked.
  static block(userId: number, companyId: number) {
    return db.transaction(async (query) => {
      const rows = await query(
        `INSERT INTO "CompanyBlock" ("userId", "companyId") VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING "companyId"`,
        [userId, companyId],
      );
      await query(
        `UPDATE "CompanyFollow" SET "utcDeletedDateTime" = now(), "utcUpdatedDateTime" = now()
         WHERE "userId" = $1 AND "companyId" = $2 AND "utcDeletedDateTime" IS NULL`,
        [userId, companyId],
      );
      return { changed: rows.length > 0 };
    });
  }

  static async unblock(userId: number, companyId: number) {
    const rows = await db.query(`DELETE FROM "CompanyBlock" WHERE "userId" = $1 AND "companyId" = $2 RETURNING "companyId"`, [userId, companyId]);
    return { changed: rows.length > 0 };
  }

  static async isBlocked(userId: number, companyId: number) {
    const rows = await db.query(`SELECT 1 FROM "CompanyBlock" WHERE "userId" = $1 AND "companyId" = $2`, [userId, companyId]);
    return rows.length > 0;
  }

  // What this reader blocked, most recent first.
  static list(userId: number) {
    return db.query<BlockedCompany>(
      `SELECT "c"."id", "c"."name"::text AS "name", "c"."logoUrl", "b"."utcCreatedDateTime"
       FROM "CompanyBlock" AS "b" JOIN "Company" AS "c" ON "c"."id" = "b"."companyId"
       WHERE "b"."userId" = $1
       ORDER BY "b"."utcCreatedDateTime" DESC`,
      [userId],
    );
  }

  // Every block, for backups (scripts/data).
  static getAll() {
    return db.query(`SELECT "userId", "companyId", "utcCreatedDateTime" FROM "CompanyBlock" ORDER BY "utcCreatedDateTime", "userId", "companyId"`);
  }

  static async restore(blocks: Row[] | undefined) {
    for (const block of blocks || []) {
      await db.query(`INSERT INTO "CompanyBlock" ("userId", "companyId", "utcCreatedDateTime") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [
        block.userId,
        block.companyId,
        block.utcCreatedDateTime,
      ]);
    }
  }
}
