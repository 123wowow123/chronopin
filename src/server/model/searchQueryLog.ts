import * as db from '../db';

// Combined searches people ran (0193), once per viewer per UTC day.
export default class SearchQueryLog {
  static async record(query: string, viewer: string) {
    await db.query(`INSERT INTO "SearchQueryLog" ("query", "viewer") VALUES ($1, $2) ON CONFLICT DO NOTHING`, [query, viewer]);
  }

  // The most-run in the last 30 days, by distinct viewer-days.
  static async popular(limit: number): Promise<string[]> {
    const rows = await db.query<{ query: string }>(
      `SELECT "query" FROM "SearchQueryLog"
       WHERE "day" >= (now() AT TIME ZONE 'UTC')::date - 30
         AND "query" !~ '(^|\\s)pin:'
       GROUP BY "query" ORDER BY count(*) DESC, max("day") DESC LIMIT $1`,
      [limit],
    );
    return rows.map((r) => r.query);
  }
}
