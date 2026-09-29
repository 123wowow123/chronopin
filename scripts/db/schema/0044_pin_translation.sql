-- A pin's words in another language: its title, description, key points and
-- the reasoning behind its date, as Claude translated them
-- (src/server/extract/translate.ts). One row per pin and language; a page in
-- that language shows these in place of the pin's own, and falls back to the
-- pin's own words when there is no row, or when sourceHash no longer matches
-- the text the row was translated from (the pin was edited since).
CREATE TABLE "PinTranslation" (
  "pinId" integer NOT NULL,
  "locale" varchar(8) NOT NULL,
  "title" varchar(500) NOT NULL,
  "description" text,
  "longFormSummary" text,
  "dateConfidenceReasoning" varchar(4000),
  "delayReasoning" varchar(4000),
  "sourceHash" char(40) NOT NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("pinId", "locale"),
  CONSTRAINT "PinTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh'))
);
