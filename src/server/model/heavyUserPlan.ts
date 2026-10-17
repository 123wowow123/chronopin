import * as db from '../db';

// The heavy user plan (0191): $5 for 30 days once, or $4 a month. Static
// queries, as AdFreeSubscription's are.
export const HEAVY_MONTH_CENTS = 500;
export const HEAVY_SUBSCRIPTION_CENTS = 400;
export const HEAVY_MONTH_DAYS = 30;

export type HeavyPlanKind = 'month' | 'subscription';
export type HeavyStatus = {
  active: boolean;
  plan: HeavyPlanKind | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  hasCustomer: boolean;
};

type Row = { plan: HeavyPlanKind; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean; stripeCustomerId: string | null };

// Stripe statuses that keep the plan on (past_due gets Stripe's retry window);
// anything else, a one-off payment included, lasts until currentPeriodEnd.
const ACTIVE = new Set(['active', 'trialing', 'past_due']);

function activeNow(row: Row): boolean {
  const end = row.currentPeriodEnd ? new Date(row.currentPeriodEnd).getTime() : 0;
  return (row.plan === 'subscription' && ACTIVE.has(row.status)) || end > Date.now();
}

// Whether a user has the plan is asked on every page request (the proxy), so
// the answer is kept 60s on globalThis; a payment clears it.
const TTL_MS = 60_000;
const MAX_ENTRIES = 5_000;
function cache() {
  const g = globalThis as unknown as { __chronopinHeavyPlan?: Map<number, { active: boolean; expires: number }> };
  return (g.__chronopinHeavyPlan ??= new Map());
}

export default class HeavyUserPlan {
  static async status(userId: number): Promise<HeavyStatus> {
    const [row] = await db.query<Row>(
      `SELECT "plan", "status", "currentPeriodEnd", "cancelAtPeriodEnd", "stripeCustomerId" FROM "HeavyUserPlan" WHERE "userId" = $1`,
      [userId],
    );
    if (!row) return { active: false, plan: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, hasCustomer: false };
    return {
      active: activeNow(row),
      plan: row.plan,
      currentPeriodEnd: row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toISOString() : null,
      cancelAtPeriodEnd: row.cancelAtPeriodEnd,
      hasCustomer: !!row.stripeCustomerId,
    };
  }

  static async isActive(userId: number): Promise<boolean> {
    const hit = cache().get(userId);
    if (hit && hit.expires > Date.now()) return hit.active;
    const active = (await HeavyUserPlan.status(userId)).active;
    const entries = cache();
    entries.delete(userId);
    entries.set(userId, { active, expires: Date.now() + TTL_MS });
    if (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value!);
    return active;
  }

  static async customerId(userId: number): Promise<string | null> {
    const [row] = await db.query<{ stripeCustomerId: string | null }>(`SELECT "stripeCustomerId" FROM "HeavyUserPlan" WHERE "userId" = $1`, [userId]);
    return row?.stripeCustomerId ?? null;
  }

  static async userIdForSubscription(subscriptionId: string): Promise<number | null> {
    const [row] = await db.query<{ userId: number }>(`SELECT "userId" FROM "HeavyUserPlan" WHERE "stripeSubscriptionId" = $1`, [subscriptionId]);
    return row?.userId ?? null;
  }

  // A paid one-off month: 30 days on top of what is left. Returns false when
  // this Checkout session was already counted.
  static async addMonth(userId: number, customerId: string | null, sessionId: string): Promise<boolean> {
    const rows = await db.query<{ userId: number }>(
      `INSERT INTO "HeavyUserPlan" ("userId", "plan", "stripeCustomerId", "lastSessionId", "status", "currentPeriodEnd")
       VALUES ($1, 'month', $2, $3, 'paid', now() + make_interval(days => $4))
       ON CONFLICT ("userId") DO UPDATE SET
         "plan" = CASE WHEN "HeavyUserPlan"."plan" = 'subscription' AND "HeavyUserPlan"."status" IN ('active', 'trialing', 'past_due') THEN 'subscription' ELSE 'month' END,
         "stripeCustomerId" = COALESCE(EXCLUDED."stripeCustomerId", "HeavyUserPlan"."stripeCustomerId"),
         "lastSessionId" = EXCLUDED."lastSessionId",
         "status" = CASE WHEN "HeavyUserPlan"."plan" = 'subscription' AND "HeavyUserPlan"."status" IN ('active', 'trialing', 'past_due') THEN "HeavyUserPlan"."status" ELSE 'paid' END,
         "currentPeriodEnd" = GREATEST(now(), COALESCE("HeavyUserPlan"."currentPeriodEnd", now())) + make_interval(days => $4),
         "utcUpdatedDateTime" = now()
       WHERE "HeavyUserPlan"."lastSessionId" IS DISTINCT FROM EXCLUDED."lastSessionId"
       RETURNING "userId"`,
      [userId, customerId, sessionId, HEAVY_MONTH_DAYS],
    );
    cache().delete(userId);
    return rows.length > 0;
  }

  // What Stripe says about the $4 subscription.
  static async saveSubscription(
    userId: number,
    fields: { customerId: string; subscriptionId: string; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean },
  ) {
    await db.query(
      `INSERT INTO "HeavyUserPlan" ("userId", "plan", "stripeCustomerId", "stripeSubscriptionId", "status", "currentPeriodEnd", "cancelAtPeriodEnd")
       VALUES ($1, 'subscription', $2, $3, $4, $5, $6)
       ON CONFLICT ("userId") DO UPDATE SET
         "plan" = 'subscription',
         "stripeCustomerId" = EXCLUDED."stripeCustomerId",
         "stripeSubscriptionId" = EXCLUDED."stripeSubscriptionId",
         "status" = EXCLUDED."status",
         -- keep any one-off time already paid for past the subscription's own end
         "currentPeriodEnd" = GREATEST(EXCLUDED."currentPeriodEnd", "HeavyUserPlan"."currentPeriodEnd"),
         "cancelAtPeriodEnd" = EXCLUDED."cancelAtPeriodEnd",
         "utcUpdatedDateTime" = now()`,
      [userId, fields.customerId, fields.subscriptionId, fields.status, fields.currentPeriodEnd, fields.cancelAtPeriodEnd],
    );
    cache().delete(userId);
  }
}
