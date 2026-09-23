import { identifyBot, type BotKind } from '@/lib/bots';
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
  // Counts a page request if its user agent is a bot's. Browsers are ignored,
  // so this is safe to call for every request.
  static record(userAgent: string | null, pathname: string): void {
    const bot = identifyBot(userAgent);
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

  // Since a UTC day ("YYYY-MM-DD", null for all time): each bot's requests,
  // distinct pages and last visit, busiest first, and the most crawled pages.
  static async summarize(since: string | null, limit = 25) {
    const [bots, paths] = await Promise.all([
      db.query<{ bot: string; kind: BotKind; hits: number; pages: number; lastSeen: string; userAgent: string }>(
        `SELECT DISTINCT ON ("t"."bot") "t"."bot", "t"."kind", "t"."hits", "t"."pages", "t"."lastSeen", "v"."userAgent"
         FROM (
           SELECT "bot", min("kind") AS "kind", SUM("hits")::integer AS "hits",
             COUNT(DISTINCT "path")::integer AS "pages", max("utcLastDateTime") AS "lastSeen"
           FROM "BotVisit"
           WHERE $1::date IS NULL OR "day" >= $1::date
           GROUP BY "bot"
         ) AS "t"
           JOIN "BotVisit" AS "v" ON "v"."bot" = "t"."bot" AND "v"."utcLastDateTime" = "t"."lastSeen"
         ORDER BY "t"."bot"`,
        [since],
      ),
      db.query<{ path: string; hits: number; bots: number }>(
        `SELECT "path", SUM("hits")::integer AS "hits", COUNT(DISTINCT "bot")::integer AS "bots"
         FROM "BotVisit"
         WHERE $1::date IS NULL OR "day" >= $1::date
         GROUP BY "path"
         ORDER BY "hits" DESC, "bots" DESC, "path"
         LIMIT $2`,
        [since, 10],
      ),
    ]);
    const busiest = bots
      .map((b) => ({ ...b, lastSeen: new Date(b.lastSeen).toISOString() }))
      .sort((a, b) => b.hits - a.hits || a.bot.localeCompare(b.bot));
    return { botCount: busiest.length, bots: busiest.slice(0, limit), paths };
  }
}
