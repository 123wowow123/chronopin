-- What a birthday alone cannot give a chart: the hour and the place of birth.
-- Optional and private (seen by the user and used for their own horoscope
-- only); a row exists only while the user has given at least one of them.
--
--   birthTime       the wall-clock time, as the birth certificate gives it
--   birthLatitude / birthLongitude
--                   rounded to two decimals (about a kilometre), like the
--                   default location
--   birthPlaceName  the geocoder's name for the point
--   birthTimeZone   the IANA zone the point lies in, found when it is saved,
--                   so the wall-clock time becomes the right instant
CREATE TABLE "UserBirth" (
  "userId"         integer PRIMARY KEY REFERENCES "User" ("id") ON DELETE CASCADE,
  "birthTime"      time,
  "birthLatitude"  double precision CHECK ("birthLatitude" BETWEEN -90 AND 90),
  "birthLongitude" double precision CHECK ("birthLongitude" BETWEEN -180 AND 180),
  "birthPlaceName" text CHECK (char_length("birthPlaceName") BETWEEN 1 AND 200),
  "birthTimeZone"  varchar(64),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  CHECK (("birthLatitude" IS NULL) = ("birthLongitude" IS NULL)),
  CHECK ("birthTimeZone" IS NULL OR "birthLatitude" IS NOT NULL)
);

-- A reading for one set of transits (a chart's aspects today, as
-- src/lib/transits.ts keys them), shared by everyone whose sky is the same.
CREATE TABLE "TransitHoroscope" (
  "transits"           text NOT NULL,
  "day"                date NOT NULL,
  "text"               text NOT NULL CHECK (length("text") > 0),
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("transits", "day")
);
