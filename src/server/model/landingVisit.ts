import { createHmac } from 'node:crypto';
import config from '../config';
import * as db from '../db';

// Human visits to landing pages (0138), recorded by the proxy and shown on the
// admin Landing page. Counted in memory and written together, like BotVisit.

type Pending = { day: string; path: string; source: string; hits: number; at: Date };

const FLUSH_MS = 5_000;
const MAX_PENDING = 500;
const pending = new Map<string, Pending>();
type PendingClick = { day: string; fromPath: string; pinId: number; hits: number; at: Date };
const clicks = new Map<string, PendingClick>();
let timer: ReturnType<typeof setTimeout> | null = null;

const today = () => new Date().toISOString().slice(0, 10);

// Today's hashes already known, so a repeat costs no query. Cleared when the
// UTC day turns over.
let seenDay = '';
const seen = new Set<string>();

export default class LandingVisit {
  // Whether this viewer is new today for this thing (a visit to a page, or a
  // click on a pin), marking it counted. A database failure counts the
  // request: better one extra than a gap.
  static async firstToday(viewer: string, what: string): Promise<boolean> {
    const day = today();
    if (day !== seenDay) {
      seenDay = day;
      seen.clear();
    }
    const hash = createHmac('sha256', config.secrets.session).update(`${day}\n${viewer}\n${what}`).digest('hex');
    if (seen.has(hash)) return false;
    seen.add(hash);
    try {
      const rows = await db.query(
        `WITH "old" AS (DELETE FROM "LandingSeen" WHERE "day" < $1::date - 1)
         INSERT INTO "LandingSeen" ("day", "hash") VALUES ($1::date, $2) ON CONFLICT DO NOTHING RETURNING "hash"`,
        [day, hash],
      );
      return rows.length > 0;
    } catch (err) {
      console.log('LandingSeen failed:', err instanceof Error ? err.message : err);
      return true;
    }
  }

  static record(path: string, source: string): void {
    const at = new Date();
    const day = at.toISOString().slice(0, 10);
    const key = `${day}\n${path}\n${source}`;
    const row = pending.get(key);
    if (row) {
      row.hits++;
      row.at = at;
    } else {
      pending.set(key, { day, path: path.slice(0, 300), source, hits: 1, at });
    }
    if (pending.size >= MAX_PENDING) {
      void LandingVisit.flush();
    } else if (!timer) {
      timer = setTimeout(() => void LandingVisit.flush(), FLUSH_MS);
      timer.unref?.();
    }
  }

  static async flush(): Promise<void> {
    if (timer) clearTimeout(timer);
    timer = null;
    const rows = [...pending.values()];
    pending.clear();
    const clickRows = [...clicks.values()];
    clicks.clear();
    if (clickRows.length) {
      try {
        await db.query(
          `
          INSERT INTO "LandingClick" ("day", "fromPath", "pinId", "hits", "utcLastDateTime")
          SELECT * FROM unnest($1::date[], $2::varchar[], $3::integer[], $4::integer[], $5::timestamptz[])
          ON CONFLICT ("day", "fromPath", "pinId") DO UPDATE SET
            "hits" = "LandingClick"."hits" + EXCLUDED."hits",
            "utcLastDateTime" = GREATEST("LandingClick"."utcLastDateTime", EXCLUDED."utcLastDateTime")`,
          [
            clickRows.map((r) => r.day),
            clickRows.map((r) => r.fromPath),
            clickRows.map((r) => r.pinId),
            clickRows.map((r) => r.hits),
            clickRows.map((r) => r.at.toISOString()),
          ],
        );
      } catch (err) {
        console.log('LandingClick flush failed:', err instanceof Error ? err.message : err);
      }
    }
    if (!rows.length) return;
    try {
      await db.query(
        `
        INSERT INTO "LandingVisit" ("day", "path", "source", "hits", "utcLastDateTime")
        SELECT * FROM unnest($1::date[], $2::varchar[], $3::varchar[], $4::integer[], $5::timestamptz[])
        ON CONFLICT ("day", "path", "source") DO UPDATE SET
          "hits" = "LandingVisit"."hits" + EXCLUDED."hits",
          "utcLastDateTime" = GREATEST("LandingVisit"."utcLastDateTime", EXCLUDED."utcLastDateTime")`,
        [rows.map((r) => r.day), rows.map((r) => r.path), rows.map((r) => r.source), rows.map((r) => r.hits), rows.map((r) => r.at.toISOString())],
      );
    } catch (err) {
      // Counting never breaks a page; the counts are dropped instead.
      console.log('LandingVisit.flush failed:', err instanceof Error ? err.message : err);
    }
  }

  // A restaurant (pin) opened from a landing page.
  static recordClick(fromPath: string, pinId: number): void {
    const at = new Date();
    const day = at.toISOString().slice(0, 10);
    const key = `${day}\n${fromPath}\n${pinId}`;
    const row = clicks.get(key);
    if (row) {
      row.hits++;
      row.at = at;
    } else {
      clicks.set(key, { day, fromPath: fromPath.slice(0, 300), pinId, hits: 1, at });
    }
    if (clicks.size >= MAX_PENDING) {
      void LandingVisit.flush();
    } else if (!timer) {
      timer = setTimeout(() => void LandingVisit.flush(), FLUSH_MS);
      timer.unref?.();
    }
  }

  // Visits per UTC day since a day ("YYYY-MM-DD", null for all time).
  static listDaily(since: string | null): Promise<{ day: string; hits: number }[]> {
    return db.query(
      `SELECT to_char("day", 'YYYY-MM-DD') AS "day", SUM("hits")::integer AS "hits"
       FROM "LandingVisit" WHERE $1::date IS NULL OR "day" >= $1::date
       GROUP BY "day" ORDER BY "day" DESC`,
      [since],
    );
  }

  static async summarize(since: string | null, limit = 25) {
    const [pages, sources, restaurants] = await Promise.all([
      db.query<{ path: string; hits: number }>(
        `SELECT "path", SUM("hits")::integer AS "hits" FROM "LandingVisit"
         WHERE $1::date IS NULL OR "day" >= $1::date GROUP BY "path" ORDER BY "hits" DESC, "path" LIMIT $2`,
        [since, limit],
      ),
      db.query<{ source: string; hits: number }>(
        `SELECT "source", SUM("hits")::integer AS "hits" FROM "LandingVisit"
         WHERE $1::date IS NULL OR "day" >= $1::date GROUP BY "source" ORDER BY "hits" DESC, "source" LIMIT $2`,
        [since, limit],
      ),
      // The restaurants opened most from a landing page, with the title of the
      // live pin (the id alone when it has since been deleted).
      db.query<{ pinId: number; title: string | null; hits: number }>(
        `SELECT "c"."pinId", "p"."title", SUM("c"."hits")::integer AS "hits"
         FROM "LandingClick" AS "c" LEFT JOIN "Pin" AS "p" ON "p"."id" = "c"."pinId" AND "p"."utcDeletedDateTime" IS NULL
         WHERE $1::date IS NULL OR "c"."day" >= $1::date
         GROUP BY "c"."pinId", "p"."title" ORDER BY "hits" DESC, "c"."pinId" LIMIT $2`,
        [since, limit],
      ),
    ]);
    return { pages, sources, restaurants };
  }
}
