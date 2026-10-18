-- Custom ad sizes: 10,000 impressions and up, in steps of 1,000, at $1.75 per
-- 1,000 (src/lib/sponsoredAds.ts). The fixed 1,000 and 5,000 packages stay.
ALTER TABLE "SponsoredAd" DROP CONSTRAINT IF EXISTS "SponsoredAd_impressionsBought_check";
ALTER TABLE "SponsoredAd" ADD CONSTRAINT "SponsoredAd_impressionsBought_check"
  CHECK ("impressionsBought" >= 1000 AND "impressionsBought" <= 1000000 AND "impressionsBought" % 1000 = 0);
