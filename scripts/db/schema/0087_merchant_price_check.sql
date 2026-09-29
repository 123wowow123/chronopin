-- When a listing's price was last looked at by the daily refresh
-- (src/server/services/listingPrices.ts), and when the store last answered with
-- a price or said the item is gone. A listing whose store has stopped answering
-- for a week loses its price rather than showing an old one; one that was never
-- read (a store the refresh cannot read) keeps the price it was given.
ALTER TABLE "Merchant" ADD COLUMN "priceCheckedDateTime" timestamptz;
ALTER TABLE "Merchant" ADD COLUMN "priceSeenDateTime" timestamptz;
