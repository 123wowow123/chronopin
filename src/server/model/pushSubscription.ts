import * as db from '../db';

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

// A browser that allowed notifications while signed in (0084), and where the
// push service reaches it. One row per endpoint: a browser that signs in as
// someone else moves its row to them, so the last person signed in there is
// the one it hears about.
export default class PushSubscription {
  static save(userId: number, { endpoint, p256dh, auth }: PushTarget) {
    return db.query(
      `
      INSERT INTO "PushSubscription" ("userId", "endpoint", "p256dh", "auth")
      VALUES ($1, $2, $3, $4)
      ON CONFLICT ("endpoint") DO UPDATE
      SET "userId" = EXCLUDED."userId", "p256dh" = EXCLUDED."p256dh", "auth" = EXCLUDED."auth", "utcUpdatedDateTime" = now()`,
      [userId, endpoint, p256dh, auth],
    );
  }

  // Only the signed-in user's own row: an endpoint is not proof of anything.
  static remove(userId: number, endpoint: string) {
    return db.query(`DELETE FROM "PushSubscription" WHERE "userId" = $1 AND "endpoint" = $2`, [userId, endpoint]);
  }

  // The push service said the browser dropped it.
  static forget(endpoint: string) {
    return db.query(`DELETE FROM "PushSubscription" WHERE "endpoint" = $1`, [endpoint]);
  }

  static forUser(userId: number) {
    return db.query<PushTarget>(`SELECT "endpoint", "p256dh", "auth" FROM "PushSubscription" WHERE "userId" = $1`, [userId]);
  }
}
