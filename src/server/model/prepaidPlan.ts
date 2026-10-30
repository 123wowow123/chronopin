import * as db from '../db';

// A month of the ad-free, Premium, bundle or heavy-user plan paid once with WeChat Pay
// (0235). No Stripe subscription backs it, so the ad-free and Premium models ask here too;
// the heavy-user plan keeps its own HeavyUserPlan.addMonth and uses these rows only for the reminder.
// Static queries, as HeavyUserPlan's are.
export type PrepaidKind = 'adfree' | 'premium' | 'bundle' | 'heavy';
export const PREPAID_DAYS = 30;
// The reminder email goes out this long before the month ends.
export const REMINDER_DAYS = 3;

export type DueReminder = { id: number; userId: number; plan: PrepaidKind; end: Date; email: string | null; firstName: string | null; userName: string | null };

export default class PrepaidPlan {
  // The end of the latest prepaid month covering one of `kinds`, or null when none is still running.
  static async paidThrough(userId: number, kinds: PrepaidKind[]): Promise<Date | null> {
    const [row] = await db.query<{ end: Date | null }>(
      `SELECT max("utcEndDateTime") AS "end" FROM "PrepaidPlan" WHERE "userId" = $1 AND "plan" = ANY($2) AND "utcEndDateTime" > now()`,
      [userId, kinds],
    );
    return row?.end ? new Date(row.end) : null;
  }

  // A paid session: 30 days from now, or from the end of the month already
  // running for the same plan. False when this session was already counted.
  static async add(userId: number, plan: PrepaidKind, sessionId: string): Promise<boolean> {
    const rows = await db.query<{ id: number }>(
      `INSERT INTO "PrepaidPlan" ("userId", "plan", "stripeSessionId", "utcStartDateTime", "utcEndDateTime")
       SELECT $1, $2, $3, s.start, s.start + make_interval(days => $4)
       FROM (SELECT GREATEST(now(), COALESCE(max("utcEndDateTime"), now())) AS start FROM "PrepaidPlan" WHERE "userId" = $1 AND "plan" = $2) s
       ON CONFLICT ("stripeSessionId") DO NOTHING
       RETURNING "id"`,
      [userId, plan, sessionId, PREPAID_DAYS],
    );
    return rows.length > 0;
  }

  // Months ending within REMINDER_DAYS that have not been reminded, unless the
  // same plan was bought again (a later month for that user and plan exists).
  static async dueReminders(limit: number): Promise<DueReminder[]> {
    const rows = await db.query<{ id: number; userId: number; plan: PrepaidKind; end: Date; email: string | null; firstName: string | null; userName: string | null }>(
      `SELECT p."id", p."userId", p."plan", p."utcEndDateTime" AS "end", u."email", u."firstName" AS "firstName", u."userName" AS "userName"
       FROM "PrepaidPlan" p JOIN "User" u ON u."id" = p."userId"
       WHERE p."reminderSentDateTime" IS NULL
         AND p."utcEndDateTime" > now()
         AND p."utcEndDateTime" <= now() + make_interval(days => $1)
         AND NOT EXISTS (SELECT 1 FROM "PrepaidPlan" n WHERE n."userId" = p."userId" AND n."plan" = p."plan" AND n."utcEndDateTime" > p."utcEndDateTime")
       ORDER BY p."utcEndDateTime" LIMIT $2`,
      [REMINDER_DAYS, limit],
    );
    return rows.map((r) => ({ ...r, end: new Date(r.end) }));
  }

  // Claim a reminder; false when another server already has.
  static async claimReminder(id: number): Promise<boolean> {
    const rows = await db.query(`UPDATE "PrepaidPlan" SET "reminderSentDateTime" = now() WHERE "id" = $1 AND "reminderSentDateTime" IS NULL RETURNING "id"`, [id]);
    return rows.length > 0;
  }

  static async releaseReminder(id: number) {
    await db.query(`UPDATE "PrepaidPlan" SET "reminderSentDateTime" = NULL WHERE "id" = $1`, [id]);
  }
}
