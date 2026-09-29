import { absoluteUrl, pinPath } from '@/lib/seo';
import { buildPreference, userWikiBundle, userWikiPage, type PreferenceSignal, type UserPreference } from '@/lib/userWiki';
import * as db from '../db';

// A signed-in user's preference wiki (0028, src/lib/userWiki.ts), rebuilt
// from what they do to pins.
export default class UserWiki {
  // Every live pin the user has opened, watched, liked or commented on.
  static async signals(userId: number): Promise<PreferenceSignal[]> {
    const rows = await db.query<Omit<PreferenceSignal, 'url'>>(
      `SELECT "s"."pinId", "s"."kind", "s"."at", "p"."title",
         ARRAY(SELECT "cat"."name"::text FROM "PinTag" AS "cat" WHERE "cat"."pinId" = "p"."id" AND "cat"."kind" = 'category' ORDER BY "cat"."id") AS "categories",
         "c"."name" AS "company"
       FROM (
         SELECT "pinId", 'open' AS "kind", "day"::timestamp AT TIME ZONE 'UTC' AS "at" FROM "PinView" WHERE "viewer" = $2
         UNION ALL
         SELECT "pinId", 'watch', COALESCE("utcUpdatedDateTime", "utcCreatedDateTime") FROM "Favorite" WHERE "userId" = $1 AND "utcDeletedDateTime" IS NULL
         UNION ALL
         SELECT "pinId", 'like', COALESCE("utcUpdatedDateTime", "utcCreatedDateTime") FROM "Like" WHERE "userId" = $1 AND "like" AND "utcDeletedDateTime" IS NULL
         UNION ALL
         SELECT "pinId", 'comment', "utcCreatedDateTime" FROM "Comment" WHERE "userId" = $1 AND "utcDeletedDateTime" IS NULL
       ) AS "s"
         JOIN "Pin" AS "p" ON "p"."id" = "s"."pinId" AND "p"."utcDeletedDateTime" IS NULL
         LEFT JOIN "Company" AS "c" ON "c"."id" = "p"."companyId"`,
      [userId, `u:${userId}`],
    );
    return rows.map((row) => ({ ...row, url: absoluteUrl(pinPath({ id: row.pinId, title: row.title })) }));
  }

  // Builds and saves the user's wiki; false for a user who does not exist.
  static async rebuild(userId: number): Promise<boolean> {
    const [user] = await db.query<{ id: number; userName: string }>(`SELECT "id", "userName"::text AS "userName" FROM "User" WHERE "id" = $1`, [userId]);
    if (!user) return false;
    const signals = await UserWiki.signals(userId);
    const now = new Date();
    const profile = buildPreference(signals, now);
    await db.query(
      `INSERT INTO "UserWiki" ("userId", "profile", "page", "utcBuiltDateTime")
       VALUES ($1, $2::jsonb, $3, $4)
       ON CONFLICT ("userId") DO UPDATE SET "profile" = EXCLUDED."profile", "page" = EXCLUDED."page", "utcBuiltDateTime" = EXCLUDED."utcBuiltDateTime"`,
      [userId, JSON.stringify(profile), userWikiPage(user, profile, signals, now), now],
    );
    return true;
  }

  // For after() in a route: a failed rebuild leaves the last wiki in place
  // and must not fail the request that caused it.
  static async rebuildQuietly(userId: number): Promise<void> {
    try {
      await UserWiki.rebuild(userId);
    } catch (err) {
      console.log(`user wiki ${userId} rebuild failed:`, err);
    }
  }

  // The preference the timeline weighs cards by, or null before the first build.
  static async preference(userId: number): Promise<UserPreference | null> {
    const rows = await db.query<{ profile: UserPreference }>(`SELECT "profile" FROM "UserWiki" WHERE "userId" = $1`, [userId]);
    return rows[0]?.profile ?? null;
  }

  // Users' wikis as an OKF bundle (all of them without userIds).
  static async bundle(userIds?: number[]): Promise<Map<string, string>> {
    const pages = await db.query<{ userId: number; userName: string; page: string; builtAt: Date }>(
      `SELECT "w"."userId", "u"."userName"::text AS "userName", "w"."page", "w"."utcBuiltDateTime" AS "builtAt"
       FROM "UserWiki" AS "w" JOIN "User" AS "u" ON "u"."id" = "w"."userId"
       WHERE $1::integer[] IS NULL OR "w"."userId" = ANY($1::integer[])
       ORDER BY "w"."userId"`,
      [userIds ?? null],
    );
    return userWikiBundle(pages);
  }

  static async count(): Promise<number> {
    const [{ count }] = await db.query<{ count: number }>(`SELECT COUNT(*)::integer AS "count" FROM "UserWiki"`);
    return count;
  }

  static async userIdsWithSignals(): Promise<number[]> {
    const rows = await db.query<{ id: number }>(
      `SELECT "id" FROM "User" AS "u"
       WHERE EXISTS (SELECT 1 FROM "PinView" WHERE "viewer" = 'u:' || "u"."id")
          OR EXISTS (SELECT 1 FROM "Favorite" WHERE "userId" = "u"."id" AND "utcDeletedDateTime" IS NULL)
          OR EXISTS (SELECT 1 FROM "Like" WHERE "userId" = "u"."id" AND "utcDeletedDateTime" IS NULL)
          OR EXISTS (SELECT 1 FROM "Comment" WHERE "userId" = "u"."id" AND "utcDeletedDateTime" IS NULL)
       ORDER BY "id"`,
    );
    return rows.map((r) => r.id);
  }
}
