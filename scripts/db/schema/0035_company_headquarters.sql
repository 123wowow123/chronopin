-- Where a studio is, for the map: a film, series, anime or game pin is placed
-- at the headquarters of the studio that makes it (src/server/studioLocation.ts).
-- Looked up once per company from Wikidata (headquarters location, P159), so
-- a studio's hundred pins share one lookup. A check date with no coordinates
-- means none was found.
ALTER TABLE "Company"
  ADD COLUMN "hqAddress"             varchar(500),
  ADD COLUMN "hqLatitude"            double precision,
  ADD COLUMN "hqLongitude"           double precision,
  ADD COLUMN "utcHqCheckedDateTime"  timestamptz;
