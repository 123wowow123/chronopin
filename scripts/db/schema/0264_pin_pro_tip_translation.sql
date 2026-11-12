-- A pro tip's (PinProTip, 0256) words in the other languages the site speaks.
-- English (the tip's own language) has no rows.
--
-- "sourceHash" is the sha1 of the English tip the words were made from; a row
-- whose hash no longer matches the tip is not shown, like PinTranslation (0044)
-- and PinAdTranslation (0115). PUT /api/pins/:id/pro-tips replaces a pin's
-- tips (new ids), so the rows cascade away with the old tips and the
-- translation agent makes them again.
CREATE TABLE "PinProTipTranslation" (
  "proTipId"           integer NOT NULL REFERENCES "PinProTip" ("id") ON DELETE CASCADE,
  "locale"             varchar(5) NOT NULL,
  "tip"                varchar(1500) NOT NULL,
  "sourceHash"         char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("proTipId", "locale"),
  CONSTRAINT "CK_PinProTipTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko', 'hi', 'ar', 'th', 'it', 'ru', 'pt', 'ms', 'vi', 'id')),
  CONSTRAINT "CK_PinProTipTranslation_tip" CHECK (length(btrim("tip")) > 0)
);
