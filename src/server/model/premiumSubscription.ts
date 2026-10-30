import * as db from '../db';
import PrepaidPlan from './prepaidPlan';

// The $20 a month premium plan (0223): one row per user who has subscribed,
// kept in step with the Stripe subscription by the webhook. Same shape and
// rules as AdFreeSubscription.
export type PremiumStatus = {
  active: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
};

const ACTIVE = new Set(['active', 'trialing', 'past_due']);

export default class PremiumSubscription {
  static async status(userId: number): Promise<PremiumStatus> {
    const [row] = await db.query<{ status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean }>(
      `SELECT "status", "currentPeriodEnd", "cancelAtPeriodEnd" FROM "PremiumSubscription" WHERE "userId" = $1`,
      [userId],
    );
    // A month paid once with WeChat Pay (0235) keeps the plan on with no Stripe subscription behind it.
    const prepaid = await PrepaidPlan.paidThrough(userId, ['premium', 'bundle']);
    const end = row?.currentPeriodEnd ? new Date(row.currentPeriodEnd) : null;
    const paidThrough = end != null && end.getTime() > Date.now();
    const subscribed = !!row && (ACTIVE.has(row.status) || (row.status === 'canceled' && paidThrough));
    if (prepaid && !subscribed) return { active: true, status: 'prepaid', currentPeriodEnd: prepaid.toISOString(), cancelAtPeriodEnd: true, hasCustomer: !!row };
    if (!row) return { active: false, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, hasCustomer: false };
    return {
      active: subscribed,
      status: row.status,
      currentPeriodEnd: end ? end.toISOString() : null,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      hasCustomer: true,
    };
  }

  // Admins see premium content without paying.
  static async hasAccess(user: { id: number; role?: string }): Promise<boolean> {
    return user.role === 'admin' || (await PremiumSubscription.status(user.id)).active;
  }

  static async customerId(userId: number): Promise<string | null> {
    const [row] = await db.query<{ stripeCustomerId: string }>(`SELECT "stripeCustomerId" FROM "PremiumSubscription" WHERE "userId" = $1`, [userId]);
    return row?.stripeCustomerId ?? null;
  }

  static async userIdForCustomer(customerId: string): Promise<number | null> {
    const [row] = await db.query<{ userId: number }>(`SELECT "userId" FROM "PremiumSubscription" WHERE "stripeCustomerId" = $1`, [customerId]);
    return row?.userId ?? null;
  }

  // Everyone whose plan is on right now, for the push of a new position.
  static async activeUserIds(): Promise<number[]> {
    const rows = await db.query<{ userId: number }>(
      `SELECT "userId" FROM "PremiumSubscription"
       WHERE "status" IN ('active', 'trialing', 'past_due') OR ("status" = 'canceled' AND "currentPeriodEnd" > now())
       UNION SELECT "userId" FROM "PrepaidPlan" WHERE "plan" IN ('premium', 'bundle') AND "utcEndDateTime" > now()`,
    );
    return rows.map((r) => Number(r.userId));
  }

  static async save(
    userId: number,
    fields: { customerId: string; subscriptionId: string | null; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean },
  ) {
    await db.query(
      `INSERT INTO "PremiumSubscription" ("userId", "stripeCustomerId", "stripeSubscriptionId", "status", "currentPeriodEnd", "cancelAtPeriodEnd")
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT ("userId") DO UPDATE SET
         "stripeCustomerId" = EXCLUDED."stripeCustomerId",
         "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
         "status" = EXCLUDED."status",
         "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
         "cancelAtPeriodEnd" = EXCLUDED."cancelAtPeriodEnd",
         "utcUpdatedDateTime" = now()`,
      [userId, fields.customerId, fields.subscriptionId, fields.status, fields.currentPeriodEnd, fields.cancelAtPeriodEnd],
    );
  }
}
