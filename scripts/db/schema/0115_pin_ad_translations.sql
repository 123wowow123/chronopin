-- A chosen ad's (PinAd, 0112) title in the other languages the site speaks.
-- The title is the Amazon listing's own English one, so a Korean reader saw a
-- Korean frame around an English product name. English is the listing's own
-- language, so it has no rows.
--
-- "sourceHash" is the sha1 of the English title the words were made from; a
-- row whose hash no longer matches the ad (the listing was renamed when the
-- ad was re-read) is not shown, like PinTranslation (0044).
CREATE TABLE "PinAdTranslation" (
  "pinAdId"            integer NOT NULL REFERENCES "PinAd" ("id") ON DELETE CASCADE,
  "locale"             varchar(5) NOT NULL,
  "title"              varchar(300) NOT NULL,
  "sourceHash"         char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("pinAdId", "locale"),
  CONSTRAINT "PinAdTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id'))
);
