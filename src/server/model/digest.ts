import { DIGEST_DAYS_AHEAD, DIGEST_PART_LIMIT, DIGEST_TOTAL_LIMIT } from '@/lib/weeklyDigest';
import * as db from '../db';
import { blockedBetween } from './blockSql';

// The weekly "my timeline" email's tables (0232): who gets it, one DigestSend
// per user per week, and the opens and clicks it brought back.

export type DigestReason = 'watched' | 'company' | 'followed';

export type DigestPin = {
  id: number;
  title: string;
  start: string;
  allDay: boolean;
  reason: DigestReason;
  // The company followed, or the person whose pin it is.
  label: string | null;
};

export type DigestRecipient = { id: number; email: string; firstName: string | null; userName: string | null };

export type DigestSendRow = {
  id: number;
  userName: string | null;
  weekStart: string;
  status: string;
  pinCount: number;
  error: string | null;
  openCount: number;
  clickCount: number;
  sentAt: string | null;
};

// A pending claim older than this was left by a server that died mid-build.
const STALE_PENDING = '1 hour';

export default class Digest {
  static async isSubscribed(userId: number): Promise<boolean> {
    // Everyone is subscribed until they say otherwise: no row means yes.
    const rows = await db.query(`SELECT "enabled" FROM "DigestSubscription" WHERE "userId" = $1`, [userId]);
    return rows[0]?.enabled !== false;
  }

  static async setSubscribed(userId: number, enabled: boolean): Promise<void> {
    await db.query(
      `INSERT INTO "DigestSubscription" ("userId", "enabled") VALUES ($1, $2)
       ON CONFLICT ("userId") DO UPDATE SET "enabled" = EXCLUDED."enabled", "utcUpdatedDateTime" = now()`,
      [userId, enabled],
    );
  }

  // Everyone with a confirmed address who has not opted out and has not been claimed for this
  // week yet. Oldest subscription first, so a long list is worked in order.
  static async dueRecipients(week: string, limit: number): Promise<DigestRecipient[]> {
    return db.query<DigestRecipient>(
      `SELECT u."id", u."email", u."firstName", u."userName"
       FROM "User" u LEFT JOIN "DigestSubscription" s ON s."userId" = u."id"
       WHERE COALESCE(s."enabled", true) AND u."utcDeletedDateTime" IS NULL AND u."email" IS NOT NULL AND u."emailVerifiedDateTime" IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM "DigestSend" d WHERE d."userId" = u."id" AND d."weekStart" = $1::date)
       ORDER BY u."id" LIMIT $2`,
      [week, limit],
    );
  }

  // The claim: true for the one server that gets to build this user's email.
  static async claim(userId: number, week: string): Promise<number | null> {
    const rows = await db.query(
      `INSERT INTO "DigestSend" ("userId", "weekStart") VALUES ($1, $2::date) ON CONFLICT ("userId", "weekStart") DO NOTHING RETURNING "id"`,
      [userId, week],
    );
    return rows.length ? Number(rows[0].id) : null;
  }

  static async failStale(): Promise<void> {
    await db.query(
      `UPDATE "DigestSend" SET "status" = 'failed', "error" = 'Abandoned while building'
       WHERE "status" = 'pending' AND "utcCreatedDateTime" < now() - interval '${STALE_PENDING}'`,
    );
  }

  static async finish(
    id: number,
    result: { status: 'sent' | 'skipped' | 'failed'; counts?: Record<DigestReason, number>; pinCount?: number; error?: string },
  ): Promise<void> {
    await db.query(
      `UPDATE "DigestSend" SET "status" = $2::varchar, "watchedCount" = $3, "companyCount" = $4, "followedCount" = $5, "pinCount" = $6, "error" = $7,
         "utcSentDateTime" = CASE WHEN $2::varchar = 'sent' THEN now() END
       WHERE "id" = $1`,
      [id, result.status, result.counts?.watched ?? 0, result.counts?.company ?? 0, result.counts?.followed ?? 0, result.pinCount ?? 0, result.error?.slice(0, 500) ?? null],
    );
  }

  // The pins starting in the next seven days that this user watches, that a
  // company they follow or a person they follow made - each pin once, under
  // the first reason of those three - soonest first, capped per part and in all.
  static async upcoming(userId: number, now: Date): Promise<DigestPin[]> {
    const until = new Date(now.getTime() + DIGEST_DAYS_AHEAD * 24 * 60 * 60 * 1000);
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    // An all-day pin starts at 00:00Z of its day, so today's still counts.
    const inWindow = `p."utcDeletedDateTime" IS NULL AND p."utcStartDateTime" < $4
      AND ((p."allDay" AND p."utcStartDateTime" >= $2) OR (NOT p."allDay" AND p."utcStartDateTime" >= $3))`;
    const rows = await db.query<{ id: number; title: string; start: string; allDay: boolean; reason: DigestReason; label: string | null }>(
      `SELECT * FROM (
         SELECT p."id", p."title", p."utcStartDateTime" AS "start", p."allDay", 'watched' AS "reason", NULL::text AS "label", 1 AS "rank"
         FROM "Favorite" f JOIN "Pin" p ON p."id" = f."pinId"
         WHERE f."userId" = $1 AND f."utcDeletedDateTime" IS NULL AND ${inWindow}
         UNION ALL
         SELECT p."id", p."title", p."utcStartDateTime", p."allDay", 'company', co."name"::text, 2
         FROM "CompanyFollow" cf JOIN "Company" co ON co."id" = cf."companyId" JOIN "Pin" p ON p."companyId" = cf."companyId"
         WHERE cf."userId" = $1 AND cf."utcDeletedDateTime" IS NULL AND ${inWindow}
         UNION ALL
         SELECT p."id", p."title", p."utcStartDateTime", p."allDay", 'followed', u."userName"::text, 3
         FROM "Follow" fo JOIN "User" u ON u."id" = fo."followeeId" AND u."utcDeletedDateTime" IS NULL JOIN "Pin" p ON p."userId" = fo."followeeId"
         WHERE fo."followerId" = $1 AND fo."utcDeletedDateTime" IS NULL AND ${inWindow} AND NOT ${blockedBetween('$1', 'fo."followeeId"')}
       ) x ORDER BY "start", "rank", "id"`,
      [userId, dayStart, now, until],
    );
    const seen = new Set<number>();
    const perPart: Record<DigestReason, number> = { watched: 0, company: 0, followed: 0 };
    const picked: DigestPin[] = [];
    for (const row of rows) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      if (perPart[row.reason] >= DIGEST_PART_LIMIT) continue;
      perPart[row.reason]++;
      picked.push({ id: Number(row.id), title: row.title, start: new Date(row.start).toISOString(), allDay: row.allDay, reason: row.reason, label: row.label });
      if (picked.length >= DIGEST_TOTAL_LIMIT) break;
    }
    return picked;
  }

  static async recordOpen(id: number): Promise<void> {
    await db.query(
      `UPDATE "DigestSend" SET "openCount" = "openCount" + 1, "utcOpenedDateTime" = COALESCE("utcOpenedDateTime", now()) WHERE "id" = $1 AND "status" = 'sent'`,
      [id],
    );
  }

  static async recordClick(id: number, path: string): Promise<void> {
    const rows = await db.query(
      `UPDATE "DigestSend" SET "clickCount" = "clickCount" + 1, "utcClickedDateTime" = COALESCE("utcClickedDateTime", now()) WHERE "id" = $1 AND "status" = 'sent' RETURNING "id"`,
      [id],
    );
    if (rows.length) await db.query(`INSERT INTO "DigestClick" ("sendId", "path") VALUES ($1, $2)`, [id, path.slice(0, 500)]);
  }

  // ---- Admin page ----

  static async summary() {
    const [subs] = await db.query<{ subscribers: number; verified: number; users: number }>(
      `SELECT COUNT(*) FILTER (WHERE COALESCE(s."enabled", true))::int AS "subscribers",
              COUNT(*) FILTER (WHERE COALESCE(s."enabled", true) AND u."email" IS NOT NULL AND u."emailVerifiedDateTime" IS NOT NULL)::int AS "verified",
              COUNT(*)::int AS "users"
       FROM "User" u LEFT JOIN "DigestSubscription" s ON s."userId" = u."id" WHERE u."utcDeletedDateTime" IS NULL`,
    );
    const [optedOut] = await db.query<{ n: number }>(`SELECT COUNT(*)::int AS n FROM "DigestSubscription" WHERE NOT "enabled"`);
    // Of those who get it, who has something to be told about.
    const [reachable] = await db.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM "User" u LEFT JOIN "DigestSubscription" s ON s."userId" = u."id"
         WHERE u."utcDeletedDateTime" IS NULL AND u."emailVerifiedDateTime" IS NOT NULL AND COALESCE(s."enabled", true)
         AND (EXISTS (SELECT 1 FROM "Favorite" f WHERE f."userId" = u."id" AND f."utcDeletedDateTime" IS NULL)
           OR EXISTS (SELECT 1 FROM "CompanyFollow" c WHERE c."userId" = u."id" AND c."utcDeletedDateTime" IS NULL)
           OR EXISTS (SELECT 1 FROM "Follow" o WHERE o."followerId" = u."id" AND o."utcDeletedDateTime" IS NULL))`,
    );
    return { ...subs, optedOut: optedOut.n, withInterests: reachable.n };
  }

  // One row per week, newest first.
  static async weeks(limit = 12) {
    return db.query<{
      week: string;
      sent: number;
      skipped: number;
      failed: number;
      pending: number;
      pins: number;
      opened: number;
      clicked: number;
      clicks: number;
    }>(
      `SELECT to_char("weekStart", 'YYYY-MM-DD') AS "week",
              COUNT(*) FILTER (WHERE "status" = 'sent')::int AS "sent",
              COUNT(*) FILTER (WHERE "status" = 'skipped')::int AS "skipped",
              COUNT(*) FILTER (WHERE "status" = 'failed')::int AS "failed",
              COUNT(*) FILTER (WHERE "status" = 'pending')::int AS "pending",
              COALESCE(SUM("pinCount") FILTER (WHERE "status" = 'sent'), 0)::int AS "pins",
              COUNT(*) FILTER (WHERE "status" = 'sent' AND "openCount" > 0)::int AS "opened",
              COUNT(*) FILTER (WHERE "status" = 'sent' AND "clickCount" > 0)::int AS "clicked",
              COALESCE(SUM("clickCount"), 0)::int AS "clicks"
       FROM "DigestSend" GROUP BY "weekStart" ORDER BY "weekStart" DESC LIMIT $1`,
      [limit],
    );
  }

  static async topClicked(limit = 15) {
    return db.query<{ path: string; clicks: number }>(
      `SELECT "path", COUNT(*)::int AS "clicks" FROM "DigestClick" GROUP BY "path" ORDER BY COUNT(*) DESC, "path" LIMIT $1`,
      [limit],
    );
  }

  static async recentSends(limit = 40): Promise<DigestSendRow[]> {
    return db.query<DigestSendRow>(
      `SELECT d."id", u."userName", to_char(d."weekStart", 'YYYY-MM-DD') AS "weekStart", d."status", d."pinCount", d."error", d."openCount", d."clickCount",
              to_char(d."utcSentDateTime" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "sentAt"
       FROM "DigestSend" d JOIN "User" u ON u."id" = d."userId"
       ORDER BY d."weekStart" DESC, d."id" DESC LIMIT $1`,
      [limit],
    );
  }
}
