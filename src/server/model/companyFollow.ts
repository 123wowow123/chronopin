import * as db from '../db';
import type { QueryFn, Row } from '../db';
import Notification from './notification';

export type CompanyFollowStatus = {
  followerCount: number;
  following: boolean;
};

// Who follows which company (0048). Following a company is the company side
// of following a person: every new pin for it writes a 'company' notification
// to each follower's bell. Like Follow, there is no instance state worth
// carrying, so this is a set of static queries.
export default class CompanyFollow {
  // Resolves { changed } - true when this started a follow (a new row, or a
  // revived soft-deleted one), false when the follow was already active.
  static async follow(userId: number, companyId: number) {
    const rows = await db.query(
      `
      INSERT INTO "CompanyFollow" ("userId", "companyId")
      VALUES ($1, $2)
      ON CONFLICT ("userId", "companyId") DO UPDATE SET
          "utcUpdatedDateTime" = now(),
          "utcDeletedDateTime" = NULL
      WHERE "CompanyFollow"."utcDeletedDateTime" IS NOT NULL
      RETURNING "id"`,
      [userId, companyId],
    );
    return { changed: !!rows.length };
  }

  // Resolves { changed } - true when an active follow was ended. The pins it
  // already told the follower about stay in their bell: they are about pins,
  // not about the follow, so there is nothing to take back.
  static async unfollow(userId: number, companyId: number) {
    const rows = await db.query(
      `
      UPDATE "CompanyFollow"
      SET "utcDeletedDateTime" = now(), "utcUpdatedDateTime" = now()
      WHERE "userId" = $1 AND "companyId" = $2 AND "utcDeletedDateTime" IS NULL
      RETURNING "id"`,
      [userId, companyId],
    );
    return { changed: !!rows.length };
  }

  // How many people follow this company, and whether the viewer is one of
  // them. Without a viewer (signed out) `following` is false.
  static async status(companyId: number, viewerId: number | null | undefined): Promise<CompanyFollowStatus> {
    const rows = await db.query<CompanyFollowStatus>(
      `
      SELECT
        (SELECT COUNT(*) FROM "CompanyFollow" f JOIN "User" u ON u."id" = f."userId"
          WHERE f."companyId" = $1 AND f."utcDeletedDateTime" IS NULL AND u."utcDeletedDateTime" IS NULL) AS "followerCount",
        EXISTS (SELECT 1 FROM "CompanyFollow"
          WHERE "companyId" = $1 AND "userId" = $2 AND "utcDeletedDateTime" IS NULL) AS "following"`,
      [companyId, viewerId == null ? null : viewerId],
    );
    return rows[0];
  }

  // Tells everyone following the pin's company that it was pinned, in one
  // insert. The author is the actor, and is not told about their own pin.
  // Quiet for a pin with no company, and for a company nobody follows.
  static async notifyNewPin(
    { pinId, companyId, authorId }: { pinId: number; companyId?: number | null; authorId: number },
    query: QueryFn = db.query,
  ) {
    if (!companyId) return;
    await Notification.createForCompanyFollowers({ pinId, companyId, authorId }, query);
  }

  // Every live company follow, oldest first, for backup:data.
  static async getAll() {
    return db.query(`
      SELECT "id", "userId", "companyId", "utcCreatedDateTime", "utcUpdatedDateTime"
      FROM "CompanyFollow"
      WHERE "utcDeletedDateTime" IS NULL
      ORDER BY "utcCreatedDateTime" ASC, "id" ASC`);
  }

  // Re-inserts backed-up follows with their ids and dates intact, bypassing
  // follow() - a reseed should not notify anyone about pins already there.
  static async restore(follows: Row[] | undefined) {
    for (const follow of follows || []) {
      const hasId = follow.id != null;
      const columns = ['userId', 'companyId', 'utcCreatedDateTime', 'utcUpdatedDateTime'];
      const values = [follow.userId, follow.companyId, follow.utcCreatedDateTime || new Date(), follow.utcUpdatedDateTime].map(
        (value) => (value === undefined ? null : value),
      );
      if (hasId) {
        columns.unshift('id');
        values.unshift(follow.id);
      }
      await db.query(
        `
        INSERT INTO "CompanyFollow" (${columns.map((c) => `"${c}"`).join(', ')})
        VALUES (${values.map((_v, i) => `$${i + 1}`).join(', ')})
        ON CONFLICT ("userId", "companyId") DO NOTHING`,
        values,
      );
    }
    await db.query(
      `SELECT setval(pg_get_serial_sequence('"CompanyFollow"', 'id'), GREATEST((SELECT MAX("id") FROM "CompanyFollow"), 1))`,
    );
  }
}
