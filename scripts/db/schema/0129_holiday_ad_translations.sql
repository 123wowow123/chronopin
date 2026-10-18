-- A holiday ad's (HolidayAd, 0121) title in the other languages the site
-- speaks, as PinAdTranslation (0115) does for a pin's ads. English is the
-- listing's own language, so it has no rows. "sourceHash" is the sha1 of the
-- English title the words were made from; a row whose hash no longer matches
-- the ad (the check renamed the listing) is not shown.
CREATE TABLE "HolidayAdTranslation" (
  "holidayAdId"        integer NOT NULL REFERENCES "HolidayAd" ("id") ON DELETE CASCADE,
  "locale"             varchar(5) NOT NULL,
  "title"              varchar(300) NOT NULL,
  "sourceHash"         char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("holidayAdId", "locale"),
  CONSTRAINT "HolidayAdTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id'))
);
