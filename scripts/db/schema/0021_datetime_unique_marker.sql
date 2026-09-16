-- One row per timeline marker.
--
-- "DateTime" holds the markers that are not pins: the solstices, equinoxes,
-- aphelion and perihelion read out of scripts/backup/*.json, and the public
-- holidays fetched from the Enrico API. scripts/data/index.ts --seed is
-- written for an empty database (npm run create:data) and inserts them
-- unconditionally, so running it against a database that already has them
-- gave every marker a second copy: 1412 rows where there should be 706, and
-- Winter Solstice twice on the timeline. Nothing read the table's rows as
-- unique, so nothing noticed until the two copies disagreed - one seed pass
-- had read the JSON's wall-clock strings as US Pacific rather than UTC, which
-- put its Winter Solstice eight hours after the other one, on a second day.
--
-- Two markers sharing a name and an instant are that duplicate and nothing
-- else, so let the second seed pass fail on this constraint instead. Only the
-- seed script writes here (the app just reads, in DateTime.queryByStartEndDate),
-- and it lets the insert error propagate, so create:data now stops with
-- "Seed err: ... duplicate key value violates unique constraint".

ALTER TABLE "DateTime" ADD CONSTRAINT "UQ_DateTime_title_utcStartDateTime"
  UNIQUE ("title", "utcStartDateTime");
