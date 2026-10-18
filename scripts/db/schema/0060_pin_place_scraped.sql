-- The scraped half of a pin's place (see 0059 for the handles).
--
-- 0059 deliberately stored no scores, because the Places API and Yelp Fusion
-- both cap how long their ratings may be kept. Reading Google Maps with our
-- own browser instead changes the arithmetic: the read costs a Chromium launch
-- (about 5 seconds), so it cannot happen while someone waits for the page, and
-- a value that is never kept can therefore never be shown. So the scraped
-- numbers ARE stored, with the time they were read beside them - the same
-- shape as "Pin"."marketVolume"/"marketVolumeAt" (0053), and for the same
-- reason: a reading of an outside world that goes stale on its own schedule.
--
-- Only Google is here. yelp.com/biz/... answers 403 to our browser as well as
-- to curl, so a Yelp score needs the free Fusion key and arrives through the
-- API path, which is not stored.
--
--   googleRating        0.0-5.0 as Google shows it
--   googleRatingCount   how many people rated it, which is most of what a
--                       4.6 means
--   googleHours         Google's own wording, "Open . Closes 8 PM". Stale
--                       within the hour, so the API drops it once the read is
--                       older than that rather than claiming a shut
--                       restaurant is open
--   googleName          what Google calls the place, so a wrong match shows up
--                       in a dry run instead of quietly sitting on the pin
--   checkedAt           when the scrape last ran. NULL means never.
ALTER TABLE "PinPlace"
  ADD COLUMN "googleRating"      numeric(2, 1),
  ADD COLUMN "googleRatingCount" integer,
  ADD COLUMN "googleHours"       varchar(80),
  ADD COLUMN "googleName"        varchar(200),
  ADD COLUMN "checkedAt"         timestamptz;

ALTER TABLE "PinPlace"
  ADD CONSTRAINT "CK_PinPlace_googleRating" CHECK (
    "googleRating" IS NULL OR ("googleRating" >= 0 AND "googleRating" <= 5)
  );

-- Oldest first, so the refresh job can take the stalest rows.
CREATE INDEX "IX_PinPlace_checkedAt" ON "PinPlace" ("checkedAt" NULLS FIRST);
