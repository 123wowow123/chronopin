-- A monthly plan for self-serve ads: $20 a month for 15,000 impressions, a
-- Stripe subscription tied to one ad. Each paid renewal (invoice.paid) resets
-- "impressionsServed" so the ad has its 15,000 again; cancelling lets the paid
-- period run out, then the ad finishes. One-off packages are plan 'one_time'.
ALTER TABLE "SponsoredAd"
  ADD COLUMN "plan"                 varchar(10) NOT NULL DEFAULT 'one_time' CHECK ("plan" IN ('one_time', 'monthly')),
  ADD COLUMN "stripeCustomerId"     varchar(64),
  ADD COLUMN "stripeSubscriptionId" varchar(64),
  ADD COLUMN "currentPeriodEnd"     timestamptz,
  ADD COLUMN "cancelAtPeriodEnd"    boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "SponsoredAd_stripeSubscriptionId_idx" ON "SponsoredAd" ("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL;
