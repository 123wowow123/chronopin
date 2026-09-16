import * as db from '../db';
import type { Row } from '../db';
import Notification from './notification';

export const FOLLOWING_PAGE_SIZE = 20;

export type FollowStatus = {
  followerCount: number;
  followingCount: number;
  following: boolean;
  followsYou: boolean;
};

// Who follows whom. There is no instance state worth carrying around, so this
// is a set of static queries. A follow tells the followed user through a
// 'follow' notification; unfollowing takes that notification back, so toggling
// the button does not stack up bell entries.
export default class Follow {
  // Resolves { changed } - true when this started a follow (a new row, or a
  // revived soft-deleted one), false when the follow was already active.
  static follow(followerId: number, followeeId: number) {
    return db.transaction(async (query) => {
      // The WHERE on the conflict branch leaves an active row alone, and a row
      // left alone is not RETURNed - that is how "already following" shows.
      const rows = await query(
        `
        INSERT INTO "Follow" ("followerId", "followeeId")
        VALUES ($1, $2)
        ON CONFLICT ("followerId", "followeeId") DO UPDATE SET
            "utcUpdatedDateTime" = now(),
            "utcDeletedDateTime" = NULL
        WHERE "Follow"."utcDeletedDateTime" IS NOT NULL
        RETURNING "id"`,
        [followerId, followeeId],
      );
      if (!rows.length) {
        return { changed: false };
      }
      await Notification.create({ userId: followeeId, actorId: followerId, type: Notification.types.follow }, query);
      return { changed: true };
    });
  }

  // Resolves { changed } - true when an active follow was ended.
  static unfollow(followerId: number, followeeId: number) {
    return db.transaction(async (query) => {
      const rows = await query(
        `
        UPDATE "Follow"
        SET "utcDeletedDateTime" = now(), "utcUpdatedDateTime" = now()
        WHERE "followerId" = $1 AND "followeeId" = $2 AND "utcDeletedDateTime" IS NULL
        RETURNING "id"`,
        [followerId, followeeId],
      );
      if (!rows.length) {
        return { changed: false };
      }
      await Notification.retract({ userId: followeeId, actorId: followerId, type: Notification.types.follow }, query);
      return { changed: true };
    });
  }

  // Counts for userId, plus how viewerId relates to them. Without a viewer
  // (signed out) both relationship flags are false. Soft-deleted users are
  // not counted on either side.
  static async status(userId: number, viewerId: number | null | undefined): Promise<FollowStatus> {
    const rows = await db.query<FollowStatus>(
      `
      SELECT
        (SELECT COUNT(*) FROM "Follow" f JOIN "User" u ON u."id" = f."followerId"
          WHERE f."followeeId" = $1 AND f."utcDeletedDateTime" IS NULL AND u."utcDeletedDateTime" IS NULL) AS "followerCount",
        (SELECT COUNT(*) FROM "Follow" f JOIN "User" u ON u."id" = f."followeeId"
          WHERE f."followerId" = $1 AND f."utcDeletedDateTime" IS NULL AND u."utcDeletedDateTime" IS NULL) AS "followingCount",
        EXISTS (SELECT 1 FROM "Follow"
          WHERE "followerId" = $2 AND "followeeId" = $1 AND "utcDeletedDateTime" IS NULL) AS "following",
        EXISTS (SELECT 1 FROM "Follow"
          WHERE "followerId" = $1 AND "followeeId" = $2 AND "utcDeletedDateTime" IS NULL) AS "followsYou"`,
      [userId, viewerId == null ? null : viewerId],
    );
    return rows[0];
  }

  // Who userId follows, newest follow first, a page at a time for the profile
  // page's Following section. `after` is the previous page's `next` (a Follow
  // id: they rise in the order follows were first made, as utcCreatedDateTime
  // does, and a revived follow keeps both), `q` keeps handles containing it,
  // and `total` counts every match, not just this page.
  static async listFollowing(userId: number, { limit = FOLLOWING_PAGE_SIZE, after, q }: { limit?: number; after?: number | null; q?: string | null } = {}) {
    const text = q?.trim().replace(/^@+/, '');
    const pattern = text ? `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%` : null;
    const where = `f."followerId" = $1 AND f."utcDeletedDateTime" IS NULL AND u."utcDeletedDateTime" IS NULL
        AND ($2::text IS NULL OR u."userName" ILIKE $2)`;
    const [rows, counts] = await Promise.all([
      db.query<{ followId: number; id: number; userName: string; pictureUrl: string | null }>(
        `
        SELECT f."id" AS "followId", u."id", u."userName", u."pictureUrl"
        FROM "Follow" f
        JOIN "User" u ON u."id" = f."followeeId"
        WHERE ${where} AND ($3::int IS NULL OR f."id" < $3)
        ORDER BY f."id" DESC
        LIMIT $4`,
        [userId, pattern, after ?? null, limit + 1],
      ),
      db.query<{ total: number }>(
        `
        SELECT COUNT(*) AS "total"
        FROM "Follow" f
        JOIN "User" u ON u."id" = f."followeeId"
        WHERE ${where}`,
        [userId, pattern],
      ),
    ]);
    const page = rows.slice(0, limit);
    return {
      following: page.map(({ followId: _followId, ...user }) => user),
      total: counts[0].total,
      next: rows.length > limit ? page[page.length - 1].followId : null,
    };
  }

  // Every live follow, oldest first, for backup:data.
  static async getAll() {
    const follows = await db.query(`
      SELECT "id", "followerId", "followeeId", "utcCreatedDateTime", "utcUpdatedDateTime"
      FROM "Follow"
      WHERE "utcDeletedDateTime" IS NULL
      ORDER BY "utcCreatedDateTime" ASC, "id" ASC`);
    return { follows };
  }

  // Re-inserts backed-up follows with their original id/createdDateTime
  // preserved, bypassing follow() so a reseed does not also recreate every
  // 'follow' notification.
  static async restore(follows: Row[] | undefined) {
    for (const follow of follows || []) {
      const hasId = follow.id != null;
      const columns = ['followerId', 'followeeId', 'utcCreatedDateTime', 'utcUpdatedDateTime'];
      const values = [follow.followerId, follow.followeeId, follow.utcCreatedDateTime || new Date(), follow.utcUpdatedDateTime].map(
        (value) => (value === undefined ? null : value),
      );
      if (hasId) {
        columns.unshift('id');
        values.unshift(follow.id);
      }
      await db.query(
        `
        INSERT INTO "Follow" (${columns.map((c) => `"${c}"`).join(', ')})
        VALUES (${values.map((_v, i) => `$${i + 1}`).join(', ')})
        ON CONFLICT ("followerId", "followeeId") DO NOTHING`,
        values,
      );
      if (hasId) {
        await db.query(
          `SELECT setval(pg_get_serial_sequence('"Follow"', 'id'), GREATEST((SELECT MAX("id") FROM "Follow"), 1))`,
        );
      }
    }
  }
}
