'use strict';

import * as db from '../../db';
import Notification from '../notification/notification';

// Who follows whom. There is no instance state worth carrying around, so this
// is a set of static queries. A follow tells the followed user through a
// 'follow' notification; unfollowing takes that notification back, so toggling
// the button does not stack up bell entries.
export default class Follow {

  // Resolves { changed } - true when this started a follow (a new row, or a
  // revived soft-deleted one), false when the follow was already active.
  static follow(followerId, followeeId) {
    return db.transaction(query => {
      // The WHERE on the conflict branch leaves an active row alone, and a row
      // left alone is not RETURNed - that is how "already following" shows.
      return query(`
        INSERT INTO "Follow" ("followerId", "followeeId")
        VALUES ($1, $2)
        ON CONFLICT ("followerId", "followeeId") DO UPDATE SET
            "utcUpdatedDateTime" = now(),
            "utcDeletedDateTime" = NULL
        WHERE "Follow"."utcDeletedDateTime" IS NOT NULL
        RETURNING "id"`, [followerId, followeeId])
        .then(rows => {
          if (!rows.length) {
            return { changed: false };
          }
          return Notification.create({
            userId: followeeId,
            actorId: followerId,
            type: Notification.types.follow
          }, query)
            .then(() => ({ changed: true }));
        });
    });
  }

  // Resolves { changed } - true when an active follow was ended.
  static unfollow(followerId, followeeId) {
    return db.transaction(query => {
      return query(`
        UPDATE "Follow"
        SET "utcDeletedDateTime" = now(), "utcUpdatedDateTime" = now()
        WHERE "followerId" = $1 AND "followeeId" = $2 AND "utcDeletedDateTime" IS NULL
        RETURNING "id"`, [followerId, followeeId])
        .then(rows => {
          if (!rows.length) {
            return { changed: false };
          }
          return Notification.retract({
            userId: followeeId,
            actorId: followerId,
            type: Notification.types.follow
          }, query)
            .then(() => ({ changed: true }));
        });
    });
  }

  // Counts for userId, plus how viewerId relates to them. Without a viewer
  // (signed out) both relationship flags are false. Soft-deleted users are
  // not counted on either side.
  static status(userId, viewerId) {
    return db.query(`
      SELECT
        (SELECT COUNT(*) FROM "Follow" f JOIN "User" u ON u."id" = f."followerId"
          WHERE f."followeeId" = $1 AND f."utcDeletedDateTime" IS NULL AND u."utcDeletedDateTime" IS NULL) AS "followerCount",
        (SELECT COUNT(*) FROM "Follow" f JOIN "User" u ON u."id" = f."followeeId"
          WHERE f."followerId" = $1 AND f."utcDeletedDateTime" IS NULL AND u."utcDeletedDateTime" IS NULL) AS "followingCount",
        EXISTS (SELECT 1 FROM "Follow"
          WHERE "followerId" = $2 AND "followeeId" = $1 AND "utcDeletedDateTime" IS NULL) AS "following",
        EXISTS (SELECT 1 FROM "Follow"
          WHERE "followerId" = $1 AND "followeeId" = $2 AND "utcDeletedDateTime" IS NULL) AS "followsYou"`,
      [userId, viewerId == null ? null : viewerId])
      .then(rows => rows[0]);
  }
}
