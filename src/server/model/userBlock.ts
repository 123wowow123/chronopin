import * as db from '../db';
import type { Row } from '../db';
import { blockedBetween } from './blockSql';
import Notification from './notification';

export type BlockedUser = { id: number; userName: string; pictureUrl: string | null; utcCreatedDateTime: Date };

// Readers blocking one another (0076). Static queries, as Follow is.
export default class UserBlock {
  // Blocks, and ends any follow between the two either way (taking back the
  // bell's "started following you"). Resolves { changed }: false when the
  // block was already there.
  static block(blockerId: number, blockedId: number) {
    return db.transaction(async (query) => {
      const rows = await query(
        `INSERT INTO "UserBlock" ("blockerId", "blockedId") VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING "blockerId"`,
        [blockerId, blockedId],
      );
      const ended = await query<{ followerId: number; followeeId: number }>(
        `UPDATE "Follow" SET "utcDeletedDateTime" = now(), "utcUpdatedDateTime" = now()
         WHERE (("followerId" = $1 AND "followeeId" = $2) OR ("followerId" = $2 AND "followeeId" = $1)) AND "utcDeletedDateTime" IS NULL
         RETURNING "followerId", "followeeId"`,
        [blockerId, blockedId],
      );
      for (const follow of ended) {
        await Notification.retract({ userId: follow.followeeId, actorId: follow.followerId, type: Notification.types.follow }, query);
      }
      return { changed: rows.length > 0 };
    });
  }

  static async unblock(blockerId: number, blockedId: number) {
    const rows = await db.query(`DELETE FROM "UserBlock" WHERE "blockerId" = $1 AND "blockedId" = $2 RETURNING "blockerId"`, [blockerId, blockedId]);
    return { changed: rows.length > 0 };
  }

  // Whom this user has blocked, most recent first (never who blocked them).
  static list(blockerId: number) {
    return db.query<BlockedUser>(
      `SELECT "u"."id", "u"."userName", "u"."pictureUrl", "b"."utcCreatedDateTime"
       FROM "UserBlock" AS "b" JOIN "User" AS "u" ON "u"."id" = "b"."blockedId" AND "u"."utcDeletedDateTime" IS NULL
       WHERE "b"."blockerId" = $1
       ORDER BY "b"."utcCreatedDateTime" DESC`,
      [blockerId],
    );
  }

  static async between(a: number, b: number) {
    const [row] = await db.query<{ blocked: boolean }>(`SELECT ${blockedBetween('$1', '$2')} AS "blocked"`, [a, b]);
    return row.blocked;
  }

  // Whether a block stands between a commenter and the pin's author or, for a
  // reply, the author of the comment it answers.
  static async stopsComment(userId: number, pinId: number, parentCommentId: number | null) {
    const [row] = await db.query<{ blocked: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM "Pin" WHERE "id" = $2 AND ${blockedBetween('$1::integer', '"Pin"."userId"')})
           OR EXISTS (SELECT 1 FROM "Comment" WHERE "id" = $3 AND ${blockedBetween('$1::integer', '"Comment"."userId"')}) AS "blocked"`,
      [userId, pinId, parentCommentId],
    );
    return row.blocked;
  }

  // Every block, for backups (scripts/data).
  static getAll() {
    return db.query(`SELECT "blockerId", "blockedId", "utcCreatedDateTime" FROM "UserBlock" ORDER BY "utcCreatedDateTime", "blockerId", "blockedId"`);
  }

  static async restore(blocks: Row[] | undefined) {
    for (const block of blocks || []) {
      await db.query(
        `INSERT INTO "UserBlock" ("blockerId", "blockedId", "utcCreatedDateTime") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [block.blockerId, block.blockedId, block.utcCreatedDateTime],
      );
    }
  }
}
