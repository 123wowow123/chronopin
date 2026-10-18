import type { Bot, BotKind } from '@/lib/bots';
import * as db from '../db';

// Bot requests for the site's pages (0069), recorded by the proxy and shown on
// the admin Bots page.

type Pending = { day: string; bot: string; kind: BotKind; path: string; hits: number; userAgent: string; at: Date };

// A crawler can take hundreds of pages a minute, so requests are counted in
// memory and written together: one upsert per bot, path and day every few
// seconds, rather than a write per request. Lost on a restart - a few seconds
// of crawl, which is acceptable for a traffic chart.
const FLUSH_MS = 5_000;
const MAX_PENDING = 500;
const pending = new Map<string, Pending>();
let timer: ReturnType<typeof setTimeout> | null = null;

const utcDay = (at: Date) => at.toISOString().slice(0, 10);

export default class BotVisit {
  // Counts a page request by the bot its user agent names (identifyBot).
  // Browsers (null) are ignored, so this is safe to call for every request.
  static record(bot: Bot | null, userAgent: string | null, pathname: string): void {
    if (!bot) return;
    const at = new Date();
    const path = pathname.slice(0, 300) || '/';
    const day = utcDay(at);
    const key = `${day}\n${bot.name}\n${path}`;
    const row = pending.get(key);
    if (row) {
      row.hits++;
      row.at = at;
      row.userAgent = (userAgent || '').slice(0, 500);
    } else {
      pending.set(key, { day, bot: bot.name, kind: bot.kind, path, hits: 1, userAgent: (userAgent || '').slice(0, 500), at });
    }
    if (pending.size >= MAX_PENDING) {
      void BotVisit.flush();
    } else if (!timer) {
      timer = setTimeout(() => void BotVisit.flush(), FLUSH_MS);
      timer.unref?.();
    }
  }

  // Writes what has been counted since the last flush.
  static async flush(): Promise<void> {
    if (timer) clearTimeout(timer);
    timer = null;
    const rows = [...pending.values()];
    pending.clear();
    if (!rows.length) return;
    try {
      await db.query(
        `
        INSERT INTO "BotVisit" ("day", "bot", "kind", "path", "hits", "userAgent", "utcLastDateTime")
        SELECT * FROM unnest($1::date[], $2::varchar[], $3::varchar[], $4::varchar[], $5::integer[], $6::varchar[], $7::timestamptz[])
        ON CONFLICT ("day", "bot", "path") DO UPDATE SET
          "hits" = "BotVisit"."hits" + EXCLUDED."hits",
          "userAgent" = EXCLUDED."userAgent",
          "utcLastDateTime" = GREATEST("BotVisit"."utcLastDateTime", EXCLUDED."utcLastDateTime")`,
        [
          rows.map((r) => r.day),
          rows.map((r) => r.bot),
          rows.map((r) => r.kind),
          rows.map((r) => r.path),
          rows.map((r) => r.hits),
          rows.map((r) => r.userAgent),
          rows.map((r) => r.at.toISOString()),
        ],
      );
    } catch (err) {
      // Counting bots never breaks a page; the counts are dropped instead.
      console.log('BotVisit.flush failed:', err instanceof Error ? err.message : err);
    }
  }

  // Requests per UTC day, split by kind of bot.
  static listDaily(): Promise<{ day: string; search: number; ai: number; social: number; other: number }[]> {
    return db.query(`
    SELECT to_char("day", 'YYYY-MM-DD') AS "day",
      COALESCE(SUM("hits") FILTER (WHERE "kind" = 'search'), 0)::integer AS "search",
      COALESCE(SUM("hits") FILTER (WHERE "kind" = 'ai'), 0)::integer AS "ai",
      COALESCE(SUM("hits") FILTER (WHERE "kind" = 'social'), 0)::integer AS "social",
      COALESCE(SUM("hits") FILTER (WHERE "kind" = 'other'), 0)::integer AS "other"
    FROM "BotVisit"
    GROUP BY "day"
    ORDER BY "day"`);
  }

  // For each of the UTC days given ("YYYY-MM-DD", null for all time), in
  // order: each bot's requests, distinct pages and last visit since that day,
  // busiest first, and the most crawled pages. Every range is counted in the
  // same pass over the table (FILTER per range) - the table gains thousands of
  // rows a day, and a pass per range made the admin page take seconds.
  static async summarizeRanges(sinces: (string | null)[], limit = 25) {
    const each = (f: (i: number) => string) => sinces.map((_, i) => f(i)).join(', ');
    // Each bot and path's requests in each range, null where it had none: a
    // count of the non-null ones is then a count of distinct pages (or bots)
    // without COUNT(DISTINCT), which sorts every path and was most of the time.
    const pairs = `
      SELECT "bot", "path", min("kind") AS "kind", max("utcLastDateTime") AS "lastSeen",
        ${each((i) => `SUM("hits") FILTER (WHERE $${i + 1}::date IS NULL OR "day" >= $${i + 1}::date) AS "h${i}"`)}
      FROM "BotVisit"
      GROUP BY "bot", "path"`;
    const [bots, paths] = await Promise.all([
      // A bot's last visit is the same in every range it appears in (each runs
      // to today), so its user agent is its latest row's, read off the
      // ("bot", "day") index.
      db.query<{ bot: string; kind: BotKind; lastSeen: string; userAgent: string } & Record<string, number | null>>(
        `SELECT "t".*,
           (SELECT "v"."userAgent" FROM "BotVisit" AS "v" WHERE "v"."bot" = "t"."bot"
            ORDER BY "v"."day" DESC, "v"."utcLastDateTime" DESC LIMIT 1) AS "userAgent"
         FROM (
           SELECT "bot", min("kind") AS "kind", max("lastSeen") AS "lastSeen",
             ${each((i) => `SUM("h${i}")::integer AS "hits${i}", COUNT("h${i}")::integer AS "pages${i}"`)}
           FROM (${pairs}) AS "bp"
           GROUP BY "bot"
         ) AS "t"`,
        sinces,
      ),
      db.query<{ range: number; path: string; hits: number; bots: number }>(
        `WITH "p" AS MATERIALIZED (
           SELECT "path", ${each((i) => `SUM("h${i}")::integer AS "hits${i}", COUNT("h${i}")::integer AS "bots${i}"`)}
           FROM (${pairs}) AS "bp"
           GROUP BY "path"
         )
         SELECT * FROM (${sinces
           .map(
             (_, i) =>
               `(SELECT ${i} AS "range", "path", "hits${i}" AS "hits", "bots${i}" AS "bots" FROM "p" WHERE "hits${i}" IS NOT NULL
                 ORDER BY "hits${i}" DESC, "bots${i}" DESC, "path" LIMIT 10)`,
           )
           .join(' UNION ALL ')}) AS "top"
         ORDER BY "range", "hits" DESC, "bots" DESC, "path"`,
        sinces,
      ),
    ]);
    return sinces.map((_, i) => {
      const busiest = bots
        .filter((b) => b[`hits${i}`] != null)
        .map((b) => ({
          bot: b.bot,
          kind: b.kind,
          hits: b[`hits${i}`]!,
          pages: b[`pages${i}`]!,
          lastSeen: new Date(b.lastSeen).toISOString(),
          userAgent: b.userAgent,
        }))
        .sort((a, b) => b.hits - a.hits || a.bot.localeCompare(b.bot));
      return {
        botCount: busiest.length,
        bots: busiest.slice(0, limit),
        paths: paths.filter((p) => p.range === i).map(({ path, hits, bots }) => ({ path, hits, bots })),
      };
    });
  }
}
