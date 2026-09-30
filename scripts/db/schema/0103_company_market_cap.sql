-- A listed company's market value in dollars, as Nasdaq last reported it for
-- its ticker. The timeline's bag weight reads it (src/lib/bagSample.ts): a
-- large-cap company's pins weigh more on a crowded day. Null for a company
-- with no listing, or one not looked up yet.
ALTER TABLE "Company" ADD COLUMN "marketCap" bigint;
ALTER TABLE "Company" ADD COLUMN "utcMarketCapCheckedDateTime" timestamptz;
