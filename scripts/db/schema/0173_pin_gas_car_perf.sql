-- A gasoline car's performance rubric (the sibling of PinCarPerf, 0167): six
-- axes drawn as a radar on the pin page and ranked on /cars.
--
--   power, acceleration, economy, handling, space, value
--                 0 to 5 in half steps, scored against the written rubric in
--                 docs/okf/scraping/strategy.md ("Gasoline car rubric"). NULL
--                 means the spec is not published for this model.
--   rubricYear    the edition of the criteria the scores were set against.
--   reviews       independent road tests, as PinCarPerf.reviews.
-- One row per pin; looked-up data, never touched by Pin#update().
CREATE TABLE "PinGasCarPerf" (
  "pinId"        integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "power"        numeric(2, 1),
  "acceleration" numeric(2, 1),
  "economy"      numeric(2, 1),
  "handling"     numeric(2, 1),
  "space"        numeric(2, 1),
  "value"        numeric(2, 1),
  "reviews"      jsonb NOT NULL DEFAULT '[]'::jsonb,
  "source"       varchar(16) NOT NULL,
  "basis"        varchar(1000),
  "sourceUrl"    varchar(4000),
  "rubricYear"   smallint NOT NULL DEFAULT 2026,
  "checkedAt"    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinGasCarPerf_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinGasCarPerf_rubricYear" CHECK ("rubricYear" BETWEEN 2020 AND 2100),
  CONSTRAINT "CK_PinGasCarPerf_scale" CHECK (
    ("power" IS NULL OR "power" BETWEEN 0 AND 5)
    AND ("acceleration" IS NULL OR "acceleration" BETWEEN 0 AND 5)
    AND ("economy" IS NULL OR "economy" BETWEEN 0 AND 5)
    AND ("handling" IS NULL OR "handling" BETWEEN 0 AND 5)
    AND ("space" IS NULL OR "space" BETWEEN 0 AND 5)
    AND ("value" IS NULL OR "value" BETWEEN 0 AND 5)
  )
);
