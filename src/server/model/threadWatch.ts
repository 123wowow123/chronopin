import * as db from '../db';
import type { QueryFn, Row } from '../db';
import Notification from './notification';
import Pins from './pins';

// Readers watching a whole thread (0102). A row names the pin it was watched
// from; the thread is read fresh each time, so it takes in responses posted
// after the click. Watching it watches every pin in it, and each response that
// joins it later is watched on arrival. Static queries, as Follow is.
export default class ThreadWatch {
  // Whether this reader watches the thread pinId is in.
  static async watching(userId: number, pinId: number): Promise<boolean> {
    const ids = await Pins.threadIds(pinId);
    if (!ids.length) return false;
    const rows = await db.query(`SELECT 1 FROM "ThreadWatch" WHERE "userId" = $1 AND "pinId" = ANY($2::integer[]) LIMIT 1`, [userId, ids]);
    return rows.length > 0;
  }

  // Watches the thread and every pin in it. Answers with the thread's pin ids.
  static async watch(userId: number, pinId: number): Promise<number[]> {
    const ids = await Pins.threadIds(pinId);
    if (!ids.length) return [];
    await db.transaction(async (query) => {
      await query(`INSERT INTO "ThreadWatch" ("userId", "pinId") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [userId, pinId]);
      await watchPins(query, [userId], ids);
    });
    return ids;
  }

  // Stops watching the thread, and the pins in it, taking back what those
  // watches had put in the bell. Answers with the thread's pin ids.
  static async unwatch(userId: number, pinId: number): Promise<number[]> {
    const ids = await Pins.threadIds(pinId);
    if (!ids.length) return [];
    await db.transaction(async (query) => {
      await query(`DELETE FROM "ThreadWatch" WHERE "userId" = $1 AND "pinId" = ANY($2::integer[])`, [userId, ids]);
      await query(
        `UPDATE "Favorite" SET "utcDeletedDateTime" = now()
         WHERE "userId" = $1 AND "pinId" = ANY($2::integer[]) AND "utcDeletedDateTime" IS NULL`,
        [userId, ids],
      );
      for (const id of ids) await Notification.retractWatched({ userId, pinId: id }, query);
    });
    return ids;
  }

  // A response has joined a thread (a new pin, or one moved under another):
  // everyone watching that thread, bar its author, now watches it too and is
  // told in the bell. Answers with who.
  static async welcome(pinId: number, authorId: number): Promise<number[]> {
    const ids = await Pins.threadIds(pinId);
    const rows = await db.query<{ userId: number }>(
      `SELECT DISTINCT "userId" FROM "ThreadWatch" WHERE "pinId" = ANY($1::integer[]) AND "userId" <> $2`,
      [ids.filter((id) => id !== pinId), authorId],
    );
    const userIds = rows.map((row) => Number(row.userId));
    if (!userIds.length) return [];
    return db.transaction(async (query) => {
      await watchPins(query, userIds, [pinId]);
      return Notification.createForThreadWatchers({ pinId, actorId: authorId, userIds }, query);
    });
  }

  // Every thread watch, for backup:data.
  static getAll() {
    return db.query(`SELECT "userId", "pinId", "utcCreatedDateTime" FROM "ThreadWatch" ORDER BY "utcCreatedDateTime", "userId", "pinId"`);
  }

  static async restore(watches: Row[] | undefined) {
    for (const watch of watches || []) {
      await db.query(
        `INSERT INTO "ThreadWatch" ("userId", "pinId", "utcCreatedDateTime")
         SELECT $1, $2, $3 WHERE EXISTS (SELECT 1 FROM "Pin" WHERE "id" = $2)
         ON CONFLICT DO NOTHING`,
        [watch.userId, watch.pinId, watch.utcCreatedDateTime],
      );
    }
  }
}

// A watch on each of pinIds for each of userIds, reviving any that were
// taken back, as Favorite's own save does.
function watchPins(query: QueryFn, userIds: number[], pinIds: number[]) {
  return query(
    `
    INSERT INTO "Favorite" ("userId", "pinId", "utcCreatedDateTime")
    SELECT u, p, now() FROM unnest($1::integer[]) AS u CROSS JOIN unnest($2::integer[]) AS p
    ON CONFLICT ("userId", "pinId") DO UPDATE SET
        "utcUpdatedDateTime" = now(),
        "utcDeletedDateTime" = NULL
    WHERE "Favorite"."utcDeletedDateTime" IS NOT NULL`,
    [userIds, pinIds],
  );
}
