-- An advertiser's cap on how many times a self-serve ad is shown per UTC day.
-- NULL = no cap (shown at the normal pace until the bought impressions are used).
ALTER TABLE "SponsoredAd" ADD COLUMN "dailyLimit" integer CHECK ("dailyLimit" IS NULL OR "dailyLimit" >= 1);
