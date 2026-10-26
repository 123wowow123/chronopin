import * as db from '../db';

// Names given to searches (0220), by query text; shared by every viewer.
export default class SavedSearch {
  // Everyone's, newest first: { [query]: { name, by } }, by the @handle of whoever named it.
  static async list(): Promise<Record<string, { name: string; by: string | null }>> {
    const rows = await db.query<{ query: string; name: string; by: string | null }>(
      `SELECT s."query", s."name", u."userName"::text AS "by" FROM "SavedSearch" s
       LEFT JOIN "User" u ON u."id" = s."userId" AND u."utcDeletedDateTime" IS NULL
       ORDER BY s."utcCreatedDateTime" DESC LIMIT 200`,
    );
    return Object.fromEntries(rows.map((r) => [r.query, { name: r.name, by: r.by }]));
  }

  // An empty name removes it. Only whoever named a search (or an admin) changes
  // it; resolves false when it belongs to someone else.
  static async set(userId: number, admin: boolean, query: string, name: string): Promise<boolean> {
    const own = await db.query<{ userId: number | null }>(`SELECT "userId" FROM "SavedSearch" WHERE "query" = $1`, [query]);
    if (own.length && own[0].userId !== userId && !admin) return false;
    if (!name) await db.query(`DELETE FROM "SavedSearch" WHERE "query" = $1`, [query]);
    else
      await db.query(
        `INSERT INTO "SavedSearch" ("query", "name", "userId") VALUES ($1, $2, $3)
         ON CONFLICT ("query") DO UPDATE SET "name" = EXCLUDED."name"`,
        [query, name, userId],
      );
    return true;
  }

  // A short name for a list of exact pins: the tag most of them share, else the count.
  static async suggest(ids: number[]): Promise<string | null> {
    if (!ids.length) return null;
    const rows = await db.query<{ name: string; n: string }>(
      `SELECT "name"::text AS "name", count(*) AS "n" FROM "PinTagView" WHERE "pinId" = ANY($1::int[])
       GROUP BY 1 ORDER BY count(*) DESC, 1 LIMIT 1`,
      [ids],
    );
    const top = rows[0];
    // A tag only a stray pin carries says nothing about the list.
    const tag = top && Number(top.n) * 2 >= ids.length ? top.name : null;
    return (tag ?? `${ids.length} pins`).slice(0, 30);
  }
}
