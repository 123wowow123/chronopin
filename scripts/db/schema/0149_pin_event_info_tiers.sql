-- Every ticket price a page lists, not just the cheapest and dearest: the pin
-- page shows them as a table when there is more than one (adult, senior,
-- student; floor, balcony, VIP).
--
--   tiers  [{ label, price, note? }] in priceCurrency, as the page names each
--          one. Empty when a page quotes one price or none; lowPrice and
--          highPrice still span them (the Event markup's offers use those).
ALTER TABLE "PinEventInfo"
  ADD COLUMN "tiers" jsonb NOT NULL DEFAULT '[]',
  ADD CONSTRAINT "CK_PinEventInfo_tiers" CHECK (jsonb_typeof("tiers") = 'array');
