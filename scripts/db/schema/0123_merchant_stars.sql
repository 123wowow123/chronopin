-- The stars, reviews and brand of an Amazon listing, read with its price by
-- the daily refresh (src/server/services/listingPrices.ts), so the ad tile
-- for a pin's own listing shows "price · brand · ★ rating" like a chosen
-- product ad does. NULL where the store gives none (every non-Amazon store).
ALTER TABLE "Merchant" ADD COLUMN "rating" numeric(2,1);
ALTER TABLE "Merchant" ADD COLUMN "reviewCount" integer;
ALTER TABLE "Merchant" ADD COLUMN "brand" varchar(120);
-- Read every Amazon listing again soon, so the stars fill in over the next
-- few hourly runs rather than over the next 20 hours each.
UPDATE "Merchant" SET "priceCheckedDateTime" = NULL WHERE "url" ~* '^https?://(www\.|smile\.)?amazon\.com/';
