-- All-day pins cover whole UTC calendar days: "utcStartDateTime" is 00:00Z of
-- the first day and "utcEndDateTime", when set, 00:00Z of the day after the
-- last day (exclusive). See server/model/pin/shared/dates.js.
--
-- Until now the time depended on who wrote the pin: the browser form saved
-- the author's local midnight (07:00Z/08:00Z from California), the extractor
-- and scraping scripts used noon UTC, and a few ends were a local 23:59:59.
-- Flooring each to its UTC day keeps the date that was meant.

UPDATE "Pin"
SET "utcStartDateTime" = date_trunc('day', "utcStartDateTime", 'UTC'),
    "utcEndDateTime" = date_trunc('day', "utcEndDateTime", 'UTC')
WHERE "allDay";

-- A floored end that no longer passes the start is a one-day pin.
UPDATE "Pin"
SET "utcEndDateTime" = NULL
WHERE "allDay" AND "utcEndDateTime" <= "utcStartDateTime";

ALTER TABLE "Pin" ADD CONSTRAINT "CK_Pin_allDayUtcMidnight" CHECK (
  NOT "allDay" OR (
    "utcStartDateTime" = date_trunc('day', "utcStartDateTime", 'UTC')
    AND ("utcEndDateTime" IS NULL OR "utcEndDateTime" = date_trunc('day', "utcEndDateTime", 'UTC'))
  )
);
