-- The user's default location: where distances are measured from, the bell's
-- weather is for and the map opens on, when the browser gives no position of
-- its own. Set on the profile - from the device, or a place picked from a
-- search - and, while "locationFromDevice" is on, kept up to date from the
-- device whenever the browser already allows its position. NULL is "not
-- set", and every reader falls back to the city of the viewer's time zone.
--
--   locationLatitude, locationLongitude
--       rounded to two decimals (about a kilometre) before they are stored,
--       so no finer position than that is ever kept (see src/lib/location.ts)
--   locationName
--       what the geocoder called the point ("Brooklyn, New York, United
--       States"), never typed by hand
--   locationFromDevice
--       whether the device may keep moving it; picking a place turns it off
ALTER TABLE "User"
  ADD COLUMN "locationLatitude" double precision
    CONSTRAINT "User_locationLatitude_check" CHECK ("locationLatitude" BETWEEN -90 AND 90),
  ADD COLUMN "locationLongitude" double precision
    CONSTRAINT "User_locationLongitude_check" CHECK ("locationLongitude" BETWEEN -180 AND 180),
  ADD COLUMN "locationName" text
    CONSTRAINT "User_locationName_check" CHECK (char_length("locationName") BETWEEN 1 AND 200),
  ADD COLUMN "locationFromDevice" boolean NOT NULL DEFAULT true,
  -- A point is both halves or neither, and a name needs a point.
  ADD CONSTRAINT "User_location_pair_check" CHECK (
    ("locationLatitude" IS NULL) = ("locationLongitude" IS NULL)
    AND ("locationName" IS NULL OR "locationLatitude" IS NOT NULL)
  );
