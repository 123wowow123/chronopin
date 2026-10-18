-- The heavy user plan: for people who read the site so fast that the per-address
-- limit (src/server/botLimit.ts ipRetryAfter) stops them. $5 once buys 30 days
-- ('month', a Checkout payment), or $4 a month renews ('subscription'). Either
-- turns ads off and swaps the limit for a light per-user one. One row a user;
-- "currentPeriodEnd" is when the paid time ends. A one-off payment adds 30 days
-- to whatever is left; "lastSessionId" keeps a repeated webhook from adding twice.
CREATE TABLE "HeavyUserPlan" (
  "userId"               integer PRIMARY KEY REFERENCES "User" ("id") ON DELETE CASCADE,
  "plan"                 varchar(12) NOT NULL CHECK ("plan" IN ('month', 'subscription')),
  "stripeCustomerId"     varchar(100),
  "stripeSubscriptionId" varchar(100),
  "lastSessionId"        varchar(100),
  -- paid (one-off), or the Stripe subscription's own status
  "status"               varchar(30) NOT NULL,
  "currentPeriodEnd"     timestamptz,
  "cancelAtPeriodEnd"    boolean NOT NULL DEFAULT false,
  "utcCreatedDateTime"   timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime"   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "HeavyUserPlan_customer_idx" ON "HeavyUserPlan" ("stripeCustomerId");

-- Our own tile for the plan, among the program ads. Paused ("active" false):
-- switch it on from /admin/ads or /api/admin/db when the plan is ready.
INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "minAge", "active") VALUES
  ('heavyuser', 'special', 'US', 'https://www.chronopin.com/heavy-use', '{}', 2, NULL, 13, false)
ON CONFLICT ("program", "store") DO NOTHING;
