import * as db from '../db';
import type { SponsoredPlan, SponsoredStatus } from '@/lib/sponsoredAds';

// Self-serve ads (0178). Static queries, as Favorite's are.
export type SponsoredRow = {
  id: number;
  userId: number;
  title: string;
  body: string;
  url: string;
  imageName: string | null;
  impressionsBought: number;
  priceCents: number;
  impressionsServed: number;
  dailyLimit: number | null;
  plan: SponsoredPlan;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  status: SponsoredStatus;
  rejectionReason: string | null;
  needsRefund: boolean;
  paidDateTime: string | null;
  approvedDateTime: string | null;
  utcCreatedDateTime: string;
};

const COLUMNS = `"id", "userId", "title", "body", "url", "imageName", "impressionsBought", "priceCents", "impressionsServed", "dailyLimit", "plan", "currentPeriodEnd", "cancelAtPeriodEnd", "status",
  "rejectionReason", "needsRefund", "paidDateTime", "approvedDateTime", "utcCreatedDateTime"`;

export type SponsoredStats = { impressions: number; uniques: number; clicks: number; byDay: { day: string; impressions: number; uniques: number; clicks: number }[] };

export default class SponsoredAd {
  static async get(id: number): Promise<SponsoredRow | null> {
    const [row] = await db.query<SponsoredRow>(`SELECT ${COLUMNS} FROM "SponsoredAd" WHERE "id" = $1`, [id]);
    return row ?? null;
  }

  static async getOwned(id: number, userId: number): Promise<SponsoredRow | null> {
    const [row] = await db.query<SponsoredRow>(`SELECT ${COLUMNS} FROM "SponsoredAd" WHERE "id" = $1 AND "userId" = $2`, [id, userId]);
    return row ?? null;
  }

  static listForUser(userId: number): Promise<SponsoredRow[]> {
    return db.query<SponsoredRow>(`SELECT ${COLUMNS} FROM "SponsoredAd" WHERE "userId" = $1 ORDER BY "id" DESC`, [userId]);
  }

  static async create(userId: number, f: { title: string; body: string; url: string; impressionsBought: number; priceCents: number; plan: SponsoredPlan }): Promise<SponsoredRow> {
    const [row] = await db.query<SponsoredRow>(
      `INSERT INTO "SponsoredAd" ("userId", "title", "body", "url", "impressionsBought", "priceCents", "plan")
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNS}`,
      [userId, f.title, f.body, f.url, f.impressionsBought, f.priceCents, f.plan],
    );
    return row;
  }

  // An ad that is not paid for yet can be changed freely; one that is paid for
  // keeps its headline, text and link as reviewed.
  static async update(id: number, userId: number, f: { title: string; body: string; url: string; impressionsBought: number; priceCents: number; plan: SponsoredPlan }) {
    const rows = await db.query<SponsoredRow>(
      `UPDATE "SponsoredAd" SET "title" = $3, "body" = $4, "url" = $5, "impressionsBought" = $6, "priceCents" = $7, "plan" = $8, "rejectionReason" = NULL, "utcUpdatedDateTime" = now()
       WHERE "id" = $1 AND "userId" = $2 AND "status" = 'draft' RETURNING ${COLUMNS}`,
      [id, userId, f.title, f.body, f.url, f.impressionsBought, f.priceCents, f.plan],
    );
    return rows[0] ?? null;
  }

  static async setImage(id: number, userId: number, imageName: string | null) {
    const rows = await db.query<{ previous: string | null }>(
      `UPDATE "SponsoredAd" AS "a" SET "imageName" = $3, "utcUpdatedDateTime" = now()
       FROM (SELECT "id", "imageName" AS "previous" FROM "SponsoredAd" WHERE "id" = $1 AND "userId" = $2 AND "status" = 'draft') AS "old"
       WHERE "a"."id" = "old"."id" RETURNING "old"."previous"`,
      [id, userId, imageName],
    );
    return rows.length ? { previous: rows[0].previous } : null;
  }

  // Admin: the picture of an ad in any state. Returns the previous blob name.
  static async adminSetImage(id: number, imageName: string | null) {
    const rows = await db.query<{ previous: string | null }>(
      `UPDATE "SponsoredAd" AS "a" SET "imageName" = $2, "utcUpdatedDateTime" = now()
       FROM (SELECT "id", "imageName" AS "previous" FROM "SponsoredAd" WHERE "id" = $1) AS "old"
       WHERE "a"."id" = "old"."id" RETURNING "old"."previous"`,
      [id, imageName],
    );
    return rows.length ? { previous: rows[0].previous } : null;
  }

  static async remove(id: number, userId: number): Promise<{ imageName: string | null } | null> {
    const rows = await db.query<{ imageName: string | null }>(
      `DELETE FROM "SponsoredAd" WHERE "id" = $1 AND "userId" = $2 AND "status" = 'draft' RETURNING "imageName"`,
      [id, userId],
    );
    return rows[0] ?? null;
  }

  static async rememberSession(id: number, sessionId: string) {
    await db.query(`UPDATE "SponsoredAd" SET "stripeSessionId" = $2, "utcUpdatedDateTime" = now() WHERE "id" = $1`, [id, sessionId]);
  }

  // The payment arrived: into review (or straight to live for an admin's own
  // ad). Paying twice for one ad is ignored.
  static async markPaid(
    id: number,
    f: { paymentIntent: string | null; sessionId: string; live: boolean; subscriptionId?: string | null; customerId?: string | null },
  ): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "SponsoredAd" SET "status" = $2::varchar, "paidDateTime" = now(), "stripePaymentIntent" = $3::varchar, "stripeSessionId" = $4::varchar,
         "stripeSubscriptionId" = $5::varchar, "stripeCustomerId" = $6::varchar,
         "approvedDateTime" = CASE WHEN $2::varchar = 'active' THEN now() ELSE "approvedDateTime" END, "utcUpdatedDateTime" = now()
       WHERE "id" = $1 AND "status" = 'draft' RETURNING "id"`,
      [id, f.live ? 'active' : 'in_review', f.paymentIntent, f.sessionId, f.subscriptionId ?? null, f.customerId ?? null],
    );
    return rows.length > 0;
  }

  static reviewQueue(): Promise<(SponsoredRow & { ownerName: string | null; ownerEmail: string | null; stripePaymentIntent: string | null; waitingHours: number })[]> {
    return db.query(
      `SELECT ${COLUMNS.replace(/"(\w+)"/g, '"a"."$1"')}, "u"."userName" AS "ownerName", "u"."email" AS "ownerEmail", "a"."stripePaymentIntent",
         coalesce(extract(epoch FROM now() - "a"."paidDateTime") / 3600, 0)::float8 AS "waitingHours"
       FROM "SponsoredAd" AS "a" JOIN "User" AS "u" ON "u"."id" = "a"."userId"
       WHERE "a"."status" = 'in_review' OR "a"."needsRefund" ORDER BY "a"."paidDateTime" NULLS LAST, "a"."id"`,
    );
  }

  static async approve(id: number): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "SponsoredAd" SET "status" = 'active', "approvedDateTime" = now(), "rejectionReason" = NULL, "utcUpdatedDateTime" = now()
       WHERE "id" = $1 AND "status" = 'in_review' RETURNING "id"`,
      [id],
    );
    return rows.length > 0;
  }

  // Sent back to its owner: unpaid again, with the reason, and the payment to
  // be refunded (needsRefund until Stripe confirms it).
  // A monthly ad's subscription is cancelled by the caller; its row forgets it
  // here, and its refund is by hand when the payment is not known.
  static async reject(id: number, reason: string): Promise<{ paymentIntent: string | null; subscriptionId: string | null } | null> {
    const rows = await db.query<{ paymentIntent: string | null; subscriptionId: string | null }>(
      `UPDATE "SponsoredAd" AS "a" SET "status" = 'draft', "rejectionReason" = $2,
         "needsRefund" = ("a"."stripePaymentIntent" IS NOT NULL OR "a"."stripeSubscriptionId" IS NOT NULL),
         "stripeSubscriptionId" = NULL, "currentPeriodEnd" = NULL, "cancelAtPeriodEnd" = false,
         "paidDateTime" = NULL, "utcUpdatedDateTime" = now()
       FROM (SELECT "id", "stripeSubscriptionId" AS "oldSubscription" FROM "SponsoredAd" WHERE "id" = $1) AS "old"
       WHERE "a"."id" = "old"."id" AND "a"."status" = 'in_review'
       RETURNING "a"."stripePaymentIntent" AS "paymentIntent", "old"."oldSubscription" AS "subscriptionId"`,
      [id, reason],
    );
    return rows[0] ?? null;
  }

  static async customerIdOf(id: number, userId: number): Promise<string | null> {
    const [row] = await db.query<{ customer: string | null }>(
      `SELECT "stripeCustomerId" AS "customer" FROM "SponsoredAd" WHERE "id" = $1 AND "userId" = $2`,
      [id, userId],
    );
    return row?.customer ?? null;
  }

  // A paid renewal: the monthly ad has its impressions again (and is live
  // again if it ran out). A paused ad stays paused.
  static async renewed(subscriptionId: string, periodEnd: Date | null): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "SponsoredAd" SET "impressionsServed" = 0, "currentPeriodEnd" = coalesce($2::timestamptz, "currentPeriodEnd"),
         "status" = CASE WHEN "status" = 'completed' THEN 'active' ELSE "status" END, "utcUpdatedDateTime" = now()
       WHERE "stripeSubscriptionId" = $1 AND "plan" = 'monthly' AND "status" IN ('active', 'paused', 'completed') RETURNING "id"`,
      [subscriptionId, periodEnd],
    );
    return rows.length > 0;
  }

  // The subscription changed at Stripe: cancelling is shown, and a subscription
  // that has ended finishes the ad.
  static async subscriptionChanged(subscriptionId: string, f: { cancelAtPeriodEnd: boolean; periodEnd: Date | null; ended: boolean }): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "SponsoredAd" SET "cancelAtPeriodEnd" = ($2::boolean OR $4::boolean), "currentPeriodEnd" = coalesce($3::timestamptz, "currentPeriodEnd"),
         "status" = CASE WHEN $4::boolean AND "status" IN ('active', 'paused') THEN 'completed' ELSE "status" END, "utcUpdatedDateTime" = now()
       WHERE "stripeSubscriptionId" = $1 RETURNING "id"`,
      [subscriptionId, f.cancelAtPeriodEnd, f.periodEnd, f.ended],
    );
    return rows.length > 0;
  }

  static async refunded(id: number) {
    await db.query(`UPDATE "SponsoredAd" SET "needsRefund" = false, "stripePaymentIntent" = NULL, "utcUpdatedDateTime" = now() WHERE "id" = $1`, [id]);
  }

  static async setPaused(id: number, userId: number, paused: boolean): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "SponsoredAd" SET "status" = $3::varchar, "utcUpdatedDateTime" = now()
       WHERE "id" = $1 AND "userId" = $2 AND "status" = $4::varchar RETURNING "id"`,
      [id, userId, paused ? 'paused' : 'active', paused ? 'active' : 'paused'],
    );
    return rows.length > 0;
  }

  // The live ads that still have impressions left, and have not reached their
  // daily limit today (UTC), for the ad inventory.
  static async live() {
    // A monthly ad with no Stripe subscription (one an admin made) renews
    // itself: when its period is over it has its impressions again.
    await db.query(
      `UPDATE "SponsoredAd" SET "impressionsServed" = 0,
         "currentPeriodEnd" = "currentPeriodEnd" + interval '1 month' * greatest(1, ceil(extract(epoch FROM now() - "currentPeriodEnd") / 2629800)::int),
         "status" = CASE WHEN "status" = 'completed' THEN 'active' ELSE "status" END, "utcUpdatedDateTime" = now()
       WHERE "plan" = 'monthly' AND "stripeSubscriptionId" IS NULL AND "cancelAtPeriodEnd" = false
         AND "currentPeriodEnd" IS NOT NULL AND "currentPeriodEnd" <= now() AND "status" IN ('active', 'paused', 'completed')`,
    );
    return db.query<{ id: number; title: string; body: string; url: string; imageName: string | null; remaining: number }>(
      `SELECT "a"."id", "a"."title", "a"."body", "a"."url", "a"."imageName", "a"."impressionsBought" - "a"."impressionsServed" AS "remaining"
       FROM "SponsoredAd" AS "a"
       WHERE "a"."status" = 'active' AND "a"."impressionsServed" < "a"."impressionsBought"
         AND ("a"."dailyLimit" IS NULL OR "a"."dailyLimit" > coalesce((
           SELECT sum("i"."count") FROM "AdImpression" AS "i"
           WHERE "i"."adKey" = 'u:' || "a"."id" AND "i"."day" = (now() AT TIME ZONE 'UTC')::date), 0))`,
    );
  }

  // Admin API: any ad, whoever owns it.
  static adminList(f: { status?: string; userId?: number }): Promise<(SponsoredRow & { ownerName: string | null })[]> {
    return db.query(
      `SELECT ${COLUMNS.replace(/"(\w+)"/g, '"a"."$1"')}, "u"."userName" AS "ownerName"
       FROM "SponsoredAd" AS "a" JOIN "User" AS "u" ON "u"."id" = "a"."userId"
       WHERE ($1::varchar IS NULL OR "a"."status" = $1) AND ($2::int IS NULL OR "a"."userId" = $2)
       ORDER BY "a"."id" DESC`,
      [f.status ?? null, f.userId ?? null],
    );
  }

  static async adminCreate(f: {
    userId: number; title: string; body: string; url: string; impressionsBought: number; priceCents: number;
    status: SponsoredStatus; dailyLimit: number | null;
  }): Promise<SponsoredRow> {
    const [row] = await db.query<SponsoredRow>(
      `INSERT INTO "SponsoredAd" ("userId", "title", "body", "url", "impressionsBought", "priceCents", "status", "dailyLimit", "paidDateTime", "approvedDateTime")
       VALUES ($1, $2, $3, $4, $5, $6, $7::varchar, $8,
         CASE WHEN $7::varchar = 'draft' THEN NULL ELSE now() END,
         CASE WHEN $7::varchar IN ('active', 'paused', 'completed') THEN now() ELSE NULL END)
       RETURNING ${COLUMNS}`,
      [f.userId, f.title, f.body, f.url, f.impressionsBought, f.priceCents, f.status, f.dailyLimit],
    );
    return row;
  }

  // Only the named fields change. Column names come from this list, never
  // from the request.
  static async adminUpdate(id: number, patch: Partial<{
    title: string; body: string; url: string; impressionsBought: number; priceCents: number;
    status: SponsoredStatus; dailyLimit: number | null; rejectionReason: string | null; plan: SponsoredPlan; currentPeriodEnd: string | null;
  }>): Promise<SponsoredRow | null> {
    const columns = ['title', 'body', 'url', 'impressionsBought', 'priceCents', 'status', 'dailyLimit', 'rejectionReason', 'plan', 'currentPeriodEnd'] as const;
    const sets: string[] = [];
    const values: unknown[] = [id];
    for (const column of columns) {
      if (!(column in patch)) continue;
      values.push(patch[column]);
      sets.push(`"${column}" = $${values.length}`);
    }
    if (!sets.length) return this.get(id);
    const rows = await db.query<SponsoredRow>(
      `UPDATE "SponsoredAd" SET ${sets.join(', ')}, "utcUpdatedDateTime" = now() WHERE "id" = $1 RETURNING ${COLUMNS}`,
      values,
    );
    return rows[0] ?? null;
  }

  static async adminDelete(id: number): Promise<{ imageName: string | null } | null> {
    const rows = await db.query<{ imageName: string | null }>(`DELETE FROM "SponsoredAd" WHERE "id" = $1 RETURNING "imageName"`, [id]);
    return rows[0] ?? null;
  }

  // Sets or clears (null) the daily cap; allowed in any state but completed.
  static async setDailyLimit(id: number, userId: number, dailyLimit: number | null): Promise<boolean> {
    const rows = await db.query(
      `UPDATE "SponsoredAd" SET "dailyLimit" = $3::int, "utcUpdatedDateTime" = now()
       WHERE "id" = $1 AND "userId" = $2 AND "status" <> 'completed' RETURNING "id"`,
      [id, userId, dailyLimit],
    );
    return rows.length > 0;
  }

  // One more impression for each ad served; an ad that reaches what was bought,
  // or today's daily limit, is out of the inventory. Returns true when one did
  // (the inventory is then reread).
  static async served(ids: number[]): Promise<boolean> {
    if (!ids.length) return false;
    const rows = await db.query<{ id: number; status: string; dailyLimit: number | null; today: number }>(
      `UPDATE "SponsoredAd" AS "a" SET "impressionsServed" = "a"."impressionsServed" + 1,
         "status" = CASE WHEN "a"."impressionsServed" + 1 >= "a"."impressionsBought" THEN 'completed' ELSE "a"."status" END
       WHERE "a"."id" = ANY($1::int[]) AND "a"."status" = 'active'
       RETURNING "a"."id", "a"."status", "a"."dailyLimit",
         -- today's views so far, plus this one (its AdImpression row is written next)
         coalesce((SELECT sum("i"."count") FROM "AdImpression" AS "i"
           WHERE "i"."adKey" = 'u:' || "a"."id" AND "i"."day" = (now() AT TIME ZONE 'UTC')::date), 0)::int + 1 AS "today"`,
      [ids],
    );
    return rows.some((row) => row.status === 'completed' || (row.dailyLimit != null && row.today >= row.dailyLimit));
  }

  // Impressions and clicks for the owner's ads, from the same tables the admin
  // Ads page reads, per UTC day for the last 30 days.
  static async stats(ids: number[]): Promise<Map<number, SponsoredStats>> {
    const out = new Map<number, SponsoredStats>(ids.map((id) => [id, { impressions: 0, uniques: 0, clicks: 0, byDay: [] }]));
    if (!ids.length) return out;
    const keys = ids.map((id) => `u:${id}`);
    const [impressions, clicks, perDay, distinct] = await Promise.all([
      db.query<{ adKey: string; day: string; count: number }>(
        `SELECT "adKey", to_char("day", 'YYYY-MM-DD') AS "day", sum("count")::int AS "count" FROM "AdImpression"
         WHERE "adKey" = ANY($1::varchar[]) AND "day" > (now() AT TIME ZONE 'UTC')::date - 30 GROUP BY 1, 2`,
        [keys],
      ),
      db.query<{ adKey: string; day: string; count: number }>(
        `SELECT "adKey", to_char(("utcCreatedDateTime" AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS "day", count(*)::int AS "count" FROM "AdClick"
         WHERE "adKey" = ANY($1::varchar[]) AND "utcCreatedDateTime" > now() - interval '30 days' GROUP BY 1, 2`,
        [keys],
      ),
      db.query<{ adKey: string; day: string; count: number }>(
        `SELECT "adKey", to_char("day", 'YYYY-MM-DD') AS "day", count(*)::int AS "count" FROM "AdUniqueViewer"
         WHERE "adKey" = ANY($1::varchar[]) AND "day" > (now() AT TIME ZONE 'UTC')::date - 30 GROUP BY 1, 2`,
        [keys],
      ),
      // People over the whole window, not the sum of the days (one person on
      // three days is one person).
      db.query<{ adKey: string; count: number }>(
        `SELECT "adKey", count(DISTINCT "viewerKey")::int AS "count" FROM "AdUniqueViewer"
         WHERE "adKey" = ANY($1::varchar[]) AND "day" > (now() AT TIME ZONE 'UTC')::date - 30 GROUP BY 1`,
        [keys],
      ),
    ]);
    const days = new Map<string, { day: string; impressions: number; uniques: number; clicks: number }>();
    const entry = (key: string, day: string) => {
      const id = Number(key.slice(2));
      const k = `${id}:${day}`;
      if (!days.has(k)) days.set(k, { day, impressions: 0, uniques: 0, clicks: 0 });
      return { id, row: days.get(k)! };
    };
    for (const r of impressions) entry(r.adKey, r.day).row.impressions += r.count;
    for (const r of clicks) entry(r.adKey, r.day).row.clicks += r.count;
    for (const r of perDay) entry(r.adKey, r.day).row.uniques += r.count;
    for (const r of distinct) {
      const stats = out.get(Number(r.adKey.slice(2)));
      if (stats) stats.uniques = r.count;
    }
    for (const [k, row] of days) {
      const stats = out.get(Number(k.split(':')[0]));
      if (stats) {
        stats.byDay.push(row);
        stats.impressions += row.impressions;
        stats.clicks += row.clicks;
      }
    }
    for (const s of out.values()) s.byDay.sort((a, b) => a.day.localeCompare(b.day));
    return out;
  }
}
