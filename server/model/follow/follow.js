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

  // Who userId follows, newest first, for the "manage following" page.
  static listFollowing(userId) {
    return db.query(`
      SELECT u."id", u."userName", f."utcCreatedDateTime"
      FROM "Follow" f
      JOIN "User" u ON u."id" = f."followeeId"
      WHERE f."followerId" = $1 AND f."utcDeletedDateTime" IS NULL AND u."utcDeletedDateTime" IS NULL
      ORDER BY f."utcCreatedDateTime" DESC`, [userId])
      .then(rows => {
        return { following: rows };
      });
  }

  // Every live follow, oldest first, for scripts/data's backup:data.
  static getAll() {
    return db.query(`
      SELECT "id", "followerId", "followeeId", "utcCreatedDateTime", "utcUpdatedDateTime"
      FROM "Follow"
      WHERE "utcDeletedDateTime" IS NULL
      ORDER BY "utcCreatedDateTime" ASC, "id" ASC`)
      .then(rows => {
        return { follows: rows };
      });
  }

  // Re-inserts backed-up follows with their original id/createdDateTime
  // preserved, bypassing Follow.follow() so a reseed does not also recreate
  // every 'follow' notification.
  static restore(follows) {
    return (follows || [])
      .reduce((prev, f) => prev.then(() => _insert(f)), Promise.resolve());
  }
}

function _insert(follow) {
  const hasId = follow.id != null;
  const columns = ['followerId', 'followeeId', 'utcCreatedDateTime', 'utcUpdatedDateTime'];
  const values = [follow.followerId, follow.followeeId,
    follow.utcCreatedDateTime || new Date(), follow.utcUpdatedDateTime]
    .map(value => value === undefined ? null : value);
  if (hasId) {
    columns.unshift('id');
    values.unshift(follow.id);
  }

  return db.query(`
    INSERT INTO "Follow" (${columns.map(c => `"${c}"`).join(', ')})
    VALUES (${values.map((v, i) => `$${i + 1}`).join(', ')})
    ON CONFLICT ("followerId", "followeeId") DO NOTHING
    RETURNING "id"`, values)
    .then(() => {
      return hasId ? db.query(
        `SELECT setval(pg_get_serial_sequence('"Follow"', 'id'), GREATEST((SELECT MAX("id") FROM "Follow"), 1))`) : undefined;
    });
}
