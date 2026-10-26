-- The $20 a month premium plan (Stripe) and the trader positions it unlocks.
-- PremiumSubscription mirrors AdFreeSubscription: one row per user who has
-- ever subscribed, kept in step with Stripe by the billing webhook.
-- TraderPosition is one disclosed move by a published trader (a Substack
-- author, say): our own short summary, a link to the source post, and an
-- estimated entry price read from the close on the trade date. Never the
-- author's text.

CREATE TABLE "PremiumSubscription" (
  "userId" integer PRIMARY KEY REFERENCES "User" ("id") ON DELETE CASCADE,
  "stripeCustomerId" varchar(64) NOT NULL,
  "stripeSubscriptionId" varchar(64),
  "status" varchar(32) NOT NULL,
  "currentPeriodEnd" timestamptz,
  "cancelAtPeriodEnd" boolean NOT NULL DEFAULT false,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "PremiumSubscription_stripeCustomerId_idx" ON "PremiumSubscription" ("stripeCustomerId");
CREATE UNIQUE INDEX "PremiumSubscription_stripeSubscriptionId_idx" ON "PremiumSubscription" ("stripeSubscriptionId") WHERE "stripeSubscriptionId" IS NOT NULL;

CREATE TABLE "TraderPosition" (
  "id" serial PRIMARY KEY,
  "traderSlug" varchar(120) NOT NULL,
  "traderName" varchar(200) NOT NULL,
  "ticker" varchar(24) NOT NULL,
  "instrument" varchar(16) NOT NULL CHECK ("instrument" IN ('stock', 'call', 'put', 'short')),
  "action" varchar(16) NOT NULL CHECK ("action" IN ('buy', 'sell', 'hold', 'swap')),
  "tradeDate" date NOT NULL,
  "summary" text NOT NULL,
  "sourceUrl" text NOT NULL,
  "sourceTitle" text NOT NULL,
  "entryPrice" numeric(14, 4),
  "utcPushedDateTime" timestamptz,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("traderSlug", "ticker", "instrument", "action", "tradeDate")
);
CREATE INDEX "TraderPosition_trader_idx" ON "TraderPosition" ("traderSlug", "tradeDate" DESC);
