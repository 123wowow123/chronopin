import * as db from '../db';
import HeavyUserPlan from './heavyUserPlan';

// The $1 a month ad-free plan (0177): one row per user who has subscribed,
// kept in step with the Stripe subscription by the webhook. Static queries, as
// PinNotInterested's are.
export type AdFreeStatus = {
  active: boolean;
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
};

// Stripe statuses that keep ads off. A cancelled plan stays on until the end
// of the period that was paid for; past_due gets Stripe's retry window.
const ACTIVE = new Set(['active', 'trialing', 'past_due']);

export default class AdFreeSubscription {
  static async status(userId: number): Promise<AdFreeStatus> {
    const [row] = await db.query<{ status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean }>(
      `SELECT "status", "currentPeriodEnd", "cancelAtPeriodEnd" FROM "AdFreeSubscription" WHERE "userId" = $1`,
      [userId],
    );
    if (!row) return { active: false, status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, hasCustomer: false };
    const end = row.currentPeriodEnd ? new Date(row.currentPeriodEnd) : null;
    const paidThrough = end != null && end.getTime() > Date.now();
    return {
      active: ACTIVE.has(row.status) || (row.status === 'canceled' && paidThrough),
      status: row.status,
      currentPeriodEnd: end ? end.toISOString() : null,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      hasCustomer: true,
    };
  }

  static async isActive(userId: number): Promise<boolean> {
    // The heavy user plan (0191) turns ads off too.
    return (await AdFreeSubscription.status(userId)).active || (await HeavyUserPlan.isActive(userId));
  }

  static async customerId(userId: number): Promise<string | null> {
    const [row] = await db.query<{ stripeCustomerId: string }>(`SELECT "stripeCustomerId" FROM "AdFreeSubscription" WHERE "userId" = $1`, [userId]);
    return row?.stripeCustomerId ?? null;
  }

  static async userIdForCustomer(customerId: string): Promise<number | null> {
    const [row] = await db.query<{ userId: number }>(`SELECT "userId" FROM "AdFreeSubscription" WHERE "stripeCustomerId" = $1`, [customerId]);
    return row?.userId ?? null;
  }

  // Record (or refresh) what Stripe says about a user's subscription.
  static async save(
    userId: number,
    fields: { customerId: string; subscriptionId: string | null; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean },
  ) {
    await db.query(
      `INSERT INTO "AdFreeSubscription" ("userId", "stripeCustomerId", "stripeSubscriptionId", "status", "currentPeriodEnd", "cancelAtPeriodEnd")
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
