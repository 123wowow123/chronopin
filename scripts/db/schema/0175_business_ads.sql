-- World Businesses for Sale (listings of businesses, franchises and premium
-- opportunities) through our Awin publisher account (advertiser 116725): the
-- stored url is the plain collection, and affiliateUrl() sends it through
-- awin1.com at render time (src/lib/affiliate.ts). US store only; 18+.
ALTER TABLE "Ad" DROP CONSTRAINT IF EXISTS "Ad_kind_check";
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_kind_check" CHECK ("kind" IN ('special', 'bonus', 'tradein', 'watch', 'sneaker', 'lego', 'hunting', 'business'));

INSERT INTO "Ad" ("program", "kind", "store", "url", "categories", "weight", "rewardUsd", "minAge") VALUES
  ('business_premium', 'business', 'US', 'https://worldbusinessesforsale.com/collections/premium-businesses-for-sale', '{Business,Finance,Economy}', 2, NULL, 18),
  ('business_online', 'business', 'US', 'https://worldbusinessesforsale.com/collections/technology-online-businesses', '{Business,Technology,Finance}', 1, NULL, 18),
  ('business_food', 'business', 'US', 'https://worldbusinessesforsale.com/collections/hospitality-food', '{Business,Food,Finance}', 1, NULL, 18),
  ('business_retail', 'business', 'US', 'https://worldbusinessesforsale.com/collections/retail-consumer-goods', '{Business,Finance,Economy}', 1, NULL, 18),
  ('business_services', 'business', 'US', 'https://worldbusinessesforsale.com/collections/service-based-businesses', '{Business,Finance,Economy}', 1, NULL, 18),
  ('business_franchises', 'business', 'US', 'https://worldbusinessesforsale.com/collections/franchises', '{Business,Finance,Economy}', 1, NULL, 18),
  ('business_home', 'business', 'US', 'https://worldbusinessesforsale.com/collections/home-based-businesses', '{Business,Finance,Economy}', 1, NULL, 18),
  ('business_us', 'business', 'US', 'https://worldbusinessesforsale.com/collections/united-states', '{Business,Finance,Economy}', 1, NULL, 18)
ON CONFLICT ("program", "store") DO NOTHING;
