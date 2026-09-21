import * as db from '../db';
import type { QueryFn, Row } from '../db';
import { emitNotificationsChanged } from '../events';

// Tells the live feed whose notifications a write changed, once it commits.
// rows are what the write RETURNed, so a write that changed nothing is quiet.
function announce<T extends Row[]>(query: QueryFn, rows: T): T {
  const userIds = new Set(rows.map((row) => Number(row.userId)));
  if (userIds.size) {
    db.afterCommit(query, () => userIds.forEach((userId) => emitNotificationsChanged(userId)));
  }
  return rows;
}

const types = {
  follow: 'follow',
  // Someone commented on a pin you created.
  comment: 'comment',
  // Someone replied to your comment.
  reply: 'reply',
  // Someone added references to a pin you created, instead of pinning it again.
  reference: 'reference',
  // A pin you watch lands today. The actor is the pin's author.
  today: 'today',
  // A new pin for a company you follow. The actor is the pin's author.
  company: 'company',
  // A new pin from someone you follow. The actor is the pin's author.
  pin: 'pin',
} as const;

// A batch of pins from one person, or for one company, on one day is one
// entry in the bell: a curator posting thirty scraped pins should not push
// everything else out of the list. The day is the viewer's own, so the entry
// and the "posted:" search it links to draw the same line. Every other kind
// stands alone, keyed by its own id.
const groupKey = (zone: string) => `
        concat(
          CASE n."type"
            WHEN 'pin' THEN concat('pin:', n."actorId")
            WHEN 'company' THEN concat('company:', n."companyId")
            ELSE concat('one:', n."id")
          END,
          ':', (n."utcCreatedDateTime" AT TIME ZONE ${zone})::date
        )`;

// Runs a query that reads dates in the viewer's zone, falling back to UTC for
// a zone the browser knows but PostgreSQL does not.
async function inZone<T>(timeZone: string, run: (zone: string) => Promise<T>): Promise<T> {
  try {
    return await run(timeZone);
  } catch (err) {
    if (timeZone === 'UTC') throw err;
    return run('UTC');
  }
}

// How many pins of a batch the entry carries, which is how many a "pin:"
// search can name before its URL grows silly.
const MAX_BATCH_PINS = 100;

// How many the bell lists at most; older ones are still in the table.
const DEFAULT_LIMIT = 30;

// Notification rows joined to what they mention, dropping any whose actor,
// pin or comment is gone, so the list and the unread badge always agree.
const VISIBLE_FROM = `
      FROM "Notification" n
      JOIN "User" a ON a."id" = n."actorId" AND a."utcDeletedDateTime" IS NULL
      LEFT JOIN "Pin" p ON p."id" = n."pinId"
      LEFT JOIN "Comment" c ON c."id" = n."commentId"
      LEFT JOIN "Company" co ON co."id" = n."companyId"
      WHERE (n."pinId" IS NULL OR (p."id" IS NOT NULL AND p."utcDeletedDateTime" IS NULL))
        AND (n."commentId" IS NULL OR (c."id" IS NOT NULL AND c."utcDeletedDateTime" IS NULL))
        AND (n."companyId" IS NULL OR co."id" IS NOT NULL)`;

export type NotificationItem = {
  id: number;
  type: string;
  pinId: number | null;
  pinTitle: string | null;
  commentId: number | null;
  commentText: string | null;
  companyId: number | null;
  companyName: string | null;
  companyLogoUrl: string | null;
  utcCreatedDateTime: Date;
  read: boolean;
  // How many notifications this entry stands for (1 unless it is a batch),
  // and the viewer's day they were posted on, for the "posted:" link.
  groupCount: number;
  groupDay: string;
  // The pins it stands for, newest first, capped: past the cap a batch links
  // to the day instead, which is the better answer for one that large anyway.
  pinIds: number[];
  // When each of those pins happens, in the same order: what the bell needs to
  // send a batch to the one of its pins nearest where the reader already is.
  pinStarts: Date[];
  actor: { id: number; userName: string; firstName: string; lastName: string; pictureUrl: string | null };
  followingBack: boolean;
};

// What the navbar bell shows a signed-in user. Rows are written as a side
// effect of something else (a follow, a comment), inside that action's
// transaction, so each write helper takes the transaction's query function.
export default class Notification {
  static get types() {
    return types;
  }

  static create(
    {
      userId,
      actorId,
      type,
      pinId,
      commentId,
      companyId,
    }: { userId: number; actorId: number; type: string; pinId?: number | null; commentId?: number | null; companyId?: number | null },
    query: QueryFn = db.query,
  ) {
    return query(
      `
      INSERT INTO "Notification" ("userId", "actorId", "type", "pinId", "commentId", "companyId")
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING "id", "userId"`,
      [userId, actorId, type, pinId == null ? null : pinId, commentId == null ? null : commentId, companyId == null ? null : companyId],
    ).then((rows) => announce(query, rows));
  }

  // One 'company' row per follower of the pin's company, written in a single
  // insert however many follow it (CompanyFollow.notifyNewPin). The pin's own
  // author is left out: they know. A pin saved again is told about once - the
  // unique index leaves one row per follower, pin and company.
  static createForCompanyFollowers(
    { pinId, companyId, authorId }: { pinId: number; companyId: number; authorId: number },
    query: QueryFn = db.query,
  ) {
    return query(
      `
      INSERT INTO "Notification" ("userId", "actorId", "type", "pinId", "companyId")
      SELECT f."userId", $3, 'company', $1, $2
      FROM "CompanyFollow" f
      JOIN "User" u ON u."id" = f."userId" AND u."utcDeletedDateTime" IS NULL
      WHERE f."companyId" = $2 AND f."utcDeletedDateTime" IS NULL AND f."userId" <> $3
      ON CONFLICT ("userId", "pinId", "companyId") WHERE "type" = 'company'
      DO NOTHING
      RETURNING "userId"`,
      [pinId, companyId, authorId],
    ).then((rows) => announce(query, rows));
  }

  // One 'pin' row per follower of the pin's author, the person-shaped twin of
  // createForCompanyFollowers: whoever followed them by the time the pin was
  // saved hears about it. Nobody follows themselves, so no author is excluded
  // by hand. A pin saved again is told about once - the unique index leaves
  // one row per follower and pin.
  static createForFollowers({ pinId, authorId }: { pinId: number; authorId: number }, query: QueryFn = db.query) {
    return query(
      `
      INSERT INTO "Notification" ("userId", "actorId", "type", "pinId")
      SELECT f."followerId", $2, 'pin', $1
      FROM "Follow" f
      JOIN "User" u ON u."id" = f."followerId" AND u."utcDeletedDateTime" IS NULL
      WHERE f."followeeId" = $2 AND f."utcDeletedDateTime" IS NULL AND f."followerId" <> $2
      ON CONFLICT ("userId", "pinId") WHERE "type" = 'pin'
      DO NOTHING
      RETURNING "userId"`,
      [pinId, authorId],
    ).then((rows) => announce(query, rows));
  }

  // Soft-deletes everything a comment sent (its 'comment' and 'reply'
  // notifications), for when that comment is deleted.
  static retractForComment(commentId: number, query: QueryFn = db.query) {
    return query(
      `
      UPDATE "Notification"
      SET "utcDeletedDateTime" = now()
      WHERE "commentId" = $1 AND "utcDeletedDateTime" IS NULL
      RETURNING "userId"`,
      [commentId],
    ).then((rows) => announce(query, rows));
  }

  // Writes a 'today' for each pin the user watches that lands on today's date
  // in their time zone: an all-day pin on its UTC date, a timed one on the
  // local date of its start. Safe to call on every poll: the unique index
  // leaves one per user, pin and day, and watching a pin again the same day
  // brings back the one unwatching took away.
  static async notifyWatchedToday(userId: number, timeZone: string) {
    await inZone(timeZone, (zone) =>
      db.query(
        `
        INSERT INTO "Notification" ("userId", "actorId", "type", "pinId", "pinDay")
        SELECT f."userId", p."userId", 'today', p."id", (now() AT TIME ZONE $2)::date
        FROM "Favorite" f
        JOIN "Pin" p ON p."id" = f."pinId" AND p."utcDeletedDateTime" IS NULL
        WHERE f."userId" = $1 AND f."utcDeletedDateTime" IS NULL
          AND (p."utcStartDateTime" AT TIME ZONE CASE WHEN p."allDay" THEN 'UTC' ELSE $2 END)::date
            = (now() AT TIME ZONE $2)::date
        ON CONFLICT ("userId", "pinId", "pinDay") WHERE "type" = 'today'
        DO UPDATE SET "utcDeletedDateTime" = NULL
        WHERE "Notification"."utcDeletedDateTime" IS NOT NULL
        RETURNING "userId"`,
        [userId, zone],
      ).then((rows) => announce(db.query, rows)),
    );
  }

  // Unwatching a pin takes back its 'today' notifications.
  static retractWatched({ userId, pinId }: { userId: number; pinId: number }, query: QueryFn = db.query) {
    return query(
      `
      UPDATE "Notification"
      SET "utcDeletedDateTime" = now()
      WHERE "userId" = $1 AND "pinId" = $2 AND "type" = 'today' AND "utcDeletedDateTime" IS NULL
      RETURNING "userId"`,
      [userId, pinId],
    ).then((rows) => announce(query, rows));
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
      WHERE "userId" = $1 AND "actorId" = $2 AND "type" = $3 AND "utcDeletedDateTime" IS NULL
      RETURNING "userId"`,
      [userId, actorId, type],
    ).then((rows) => announce(query, rows));
  }

  // Newest first, with the actor's public handle and whether the recipient
  // follows them back (so the bell can offer "Follow back"). Pin-shaped kinds
  // carry the pin's title and the comment's text so the bell can link to them.
  // Notifications from users, pins or comments that have since been deleted
  // are left out. A batch (see groupKey) arrives as its newest notification,
  // carrying how many others stand behind it; the limit counts entries, not
  // rows, so a batch never crowds the list.
  static list(userId: number, limit?: string | number | null, timeZone = 'UTC') {
    const n = Math.min(Math.max(parseInt(String(limit), 10) || DEFAULT_LIMIT, 1), 100);
    return inZone(timeZone, (zone) =>
      db.query<NotificationItem>(
        `
      WITH visible AS (
        SELECT n."id", n."type", n."pinId", p."title" AS "pinTitle",
               p."utcStartDateTime" AS "pinStart",
               n."commentId", c."text" AS "commentText",
               n."companyId", co."name"::text AS "companyName", co."logoUrl" AS "companyLogoUrl",
               n."utcCreatedDateTime", n."utcReadDateTime",
               to_char((n."utcCreatedDateTime" AT TIME ZONE $2)::date, 'YYYY-MM-DD') AS "groupDay",
               ${groupKey('$2')} AS "groupKey",
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
        ${VISIBLE_FROM}
          AND n."userId" = $1 AND n."utcDeletedDateTime" IS NULL
      ),
      entries AS (
        -- The newest of each batch stands for it, and a batch counts as read
        -- only once every notification in it has been.
        SELECT DISTINCT ON ("groupKey") *,
               COUNT(*) OVER (PARTITION BY "groupKey")::int AS "groupCount",
               bool_and("utcReadDateTime" IS NOT NULL) OVER (PARTITION BY "groupKey") AS "read",
               array_agg("pinId") FILTER (WHERE "pinId" IS NOT NULL)
                 OVER (PARTITION BY "groupKey" ORDER BY "utcCreatedDateTime" DESC, "id" DESC
                       ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS "pinIds",
               -- Aggregated over the same window, so a pin and its start line up.
               array_agg("pinStart") FILTER (WHERE "pinId" IS NOT NULL)
                 OVER (PARTITION BY "groupKey" ORDER BY "utcCreatedDateTime" DESC, "id" DESC
                       ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS "pinStarts"
        FROM visible
        ORDER BY "groupKey", "utcCreatedDateTime" DESC, "id" DESC
      )
      SELECT "id", "type", "pinId", "pinTitle", "commentId", "commentText", "companyId",
             "companyName", "companyLogoUrl", "utcCreatedDateTime", "read", "actor",
             "followingBack", "groupCount", "groupDay",
             COALESCE("pinIds"[1:${MAX_BATCH_PINS}], '{}') AS "pinIds",
             COALESCE("pinStarts"[1:${MAX_BATCH_PINS}], '{}') AS "pinStarts"
      FROM entries
      ORDER BY "utcCreatedDateTime" DESC, "id" DESC
      LIMIT $3`,
        [userId, zone, n],
      ),
    );
  }

  // Entries, not rows, so the badge agrees with what the list shows.
  static async unreadCount(userId: number, timeZone = 'UTC'): Promise<number> {
    const rows = await inZone(timeZone, (zone) =>
      db.query<{ count: number }>(
        `
      SELECT COUNT(DISTINCT ${groupKey('$2')}) AS "count"
      ${VISIBLE_FROM}
        AND n."userId" = $1 AND n."utcReadDateTime" IS NULL AND n."utcDeletedDateTime" IS NULL`,
        [userId, zone],
      ),
    );
    return rows[0].count;
  }

  static markAllRead(userId: number) {
    return db.query(
      `
      UPDATE "Notification"
      SET "utcReadDateTime" = now()
      WHERE "userId" = $1 AND "utcReadDateTime" IS NULL AND "utcDeletedDateTime" IS NULL
      RETURNING "userId"`,
      [userId],
    ).then((rows) => announce(db.query, rows));
  }
}
