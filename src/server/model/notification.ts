import * as db from '../db';
import type { QueryFn } from '../db';

const types = {
  follow: 'follow',
} as const;

// How many the bell lists at most; older ones are still in the table.
const DEFAULT_LIMIT = 30;

export type NotificationItem = {
  id: number;
  type: string;
  pinId: number | null;
  utcCreatedDateTime: Date;
  read: boolean;
  actor: { id: number; userName: string; firstName: string; lastName: string; pictureUrl: string | null };
  followingBack: boolean;
};

// What the navbar bell shows a signed-in user. Rows are written as a side
// effect of something else (Follow, for now), inside that action's
// transaction, so each write helper takes the transaction's query function.
export default class Notification {
  static get types() {
    return types;
  }

  static create(
    { userId, actorId, type, pinId }: { userId: number; actorId: number; type: string; pinId?: number | null },
    query: QueryFn = db.query,
  ) {
    return query(
      `
      INSERT INTO "Notification" ("userId", "actorId", "type", "pinId")
      VALUES ($1, $2, $3, $4)
      RETURNING "id"`,
      [userId, actorId, type, pinId == null ? null : pinId],
    );
  }

  // Soft-deletes what an undone action had sent, read or not.
  static retract(
    { userId, actorId, type }: { userId: number; actorId: number; type: string },
    query: QueryFn = db.query,
  ) {
    return query(
      `
      UPDATE "Notification"
      SET "utcDeletedDateTime" = now()
      WHERE "userId" = $1 AND "actorId" = $2 AND "type" = $3 AND "utcDeletedDateTime" IS NULL`,
      [userId, actorId, type],
    );
  }

  // Newest first, with the actor's public handle and whether the recipient
  // follows them back (so the bell can offer "Follow back"). Notifications
  // from users who have since been deleted are left out.
  static list(userId: number, limit?: string | number | null) {
    const n = Math.min(Math.max(parseInt(String(limit), 10) || DEFAULT_LIMIT, 1), 100);
    return db.query<NotificationItem>(
      `
      SELECT n."id", n."type", n."pinId", n."utcCreatedDateTime",
             n."utcReadDateTime" IS NOT NULL AS "read",
             json_build_object(
               'id', a."id",
               'userName', a."userName",
               'firstName', a."firstName",
               'lastName', a."lastName",
               'pictureUrl', a."pictureUrl"
             ) AS "actor",
             EXISTS (SELECT 1 FROM "Follow" f
               WHERE f."followerId" = n."userId" AND f."followeeId" = n."actorId"
                 AND f."utcDeletedDateTime" IS NULL) AS "followingBack"
      FROM "Notification" n
      JOIN "User" a ON a."id" = n."actorId" AND a."utcDeletedDateTime" IS NULL
      WHERE n."userId" = $1 AND n."utcDeletedDateTime" IS NULL
      ORDER BY n."utcCreatedDateTime" DESC, n."id" DESC
      LIMIT $2`,
      [userId, n],
    );
  }

  static async unreadCount(userId: number): Promise<number> {
    const rows = await db.query<{ count: number }>(
      `
      SELECT COUNT(*) AS "count"
      FROM "Notification" n
      JOIN "User" a ON a."id" = n."actorId" AND a."utcDeletedDateTime" IS NULL
      WHERE n."userId" = $1 AND n."utcReadDateTime" IS NULL AND n."utcDeletedDateTime" IS NULL`,
      [userId],
    );
    return rows[0].count;
  }

  static markAllRead(userId: number) {
    return db.query(
      `
      UPDATE "Notification"
      SET "utcReadDateTime" = now()
      WHERE "userId" = $1 AND "utcReadDateTime" IS NULL AND "utcDeletedDateTime" IS NULL`,
      [userId],
    );
  }
}
