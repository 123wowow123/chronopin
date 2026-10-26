import * as db from '../db';

export type Birth = { time: string | null; latitude: number | null; longitude: number | null; placeName: string | null; timeZone: string | null };

// The hour and place of birth (0222), private to the user and to the chart
// built for their own horoscope.
export default class UserBirth {
  static async get(userId: number): Promise<Birth | null> {
    const rows = await db.query<Birth>(
      `SELECT to_char("birthTime", 'HH24:MI') AS "time", "birthLatitude" AS "latitude", "birthLongitude" AS "longitude",
              "birthPlaceName" AS "placeName", "birthTimeZone" AS "timeZone"
       FROM "UserBirth" WHERE "userId" = $1`,
      [userId],
    );
    return rows[0] ?? null;
  }

  // Every user's, for the job that works out who needs which reading.
  static async all(): Promise<Map<number, Birth>> {
    const rows = await db.query<Birth & { userId: number }>(
      `SELECT "userId", to_char("birthTime", 'HH24:MI') AS "time", "birthLatitude" AS "latitude", "birthLongitude" AS "longitude",
              "birthPlaceName" AS "placeName", "birthTimeZone" AS "timeZone" FROM "UserBirth"`,
    );
    return new Map(rows.map((r) => [r.userId, r]));
  }

  // Both empty removes the row.
  static async set(userId: number, birth: Birth): Promise<void> {
    if (!birth.time && birth.latitude == null) {
      await db.query(`DELETE FROM "UserBirth" WHERE "userId" = $1`, [userId]);
      return;
    }
    await db.query(
      `INSERT INTO "UserBirth" ("userId", "birthTime", "birthLatitude", "birthLongitude", "birthPlaceName", "birthTimeZone", "utcUpdatedDateTime")
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT ("userId") DO UPDATE SET "birthTime" = EXCLUDED."birthTime", "birthLatitude" = EXCLUDED."birthLatitude",
         "birthLongitude" = EXCLUDED."birthLongitude", "birthPlaceName" = EXCLUDED."birthPlaceName", "birthTimeZone" = EXCLUDED."birthTimeZone",
         "utcUpdatedDateTime" = now()`,
      [userId, birth.time || null, birth.latitude, birth.longitude, birth.placeName, birth.timeZone],
    );
  }
}
