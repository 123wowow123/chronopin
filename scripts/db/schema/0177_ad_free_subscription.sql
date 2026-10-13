-- The $1 a month "no ads" plan (Stripe). One row per user who has ever
-- subscribed; the webhook (src/app/api/billing/webhook) keeps it in step with
-- the Stripe subscription. Ads are off while status is 'active' or 'trialing',
-- or while a cancelled plan's paid period has not yet ended.

CREATE TABLE "AdFreeSubscription" (
  "userId" integer PRIMARY KEY REFERENCES "User" ("id") ON DELETE CASCADE,
  "stripeCustomerId" varchar(64) NOT NULL,
  "stripeSubscriptionId" varchar(64),
  "status" varchar(32) NOT NULL,
  "currentPeriodEnd" timestamptz,
  "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "AdFreeSubscription_stripeCustomerId_idx" ON "AdFreeSubscription" ("stripeCustomerId");
CREATE UNIQUE INDEX "AdFreeSubscription_stripeSubscriptionId_idx" ON "AdFreeSubscription" ("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL;
