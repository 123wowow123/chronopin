-- An AI video model version's rubric (the sibling of PinAircraftPerf, 0210): six axes
-- drawn as a radar on the pin page.
--
--   resolution, duration, audio, control, speed, realism
--                 0 to 5 in half steps, scored against the written rubric in
--                 docs/okf/scraping/strategy.md ("Video model rubric"). NULL
--                 means the spec is not published for this version.
--   rubricYear    the edition of the criteria the scores were set against.
--   reviews       independent reviews (pilot and press), as PinCarPerf.reviews.
-- One row per pin; looked-up data, never touched by Pin#update().
CREATE TABLE "PinVideoPerf" (
  "pinId"      integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "resolution"      numeric(2, 1),
  "duration"   numeric(2, 1),
  "audio" numeric(2, 1),
  "speed"      numeric(2, 1),
  "control"     numeric(2, 1),
  "realism"    numeric(2, 1),
  "reviews"    jsonb NOT NULL DEFAULT '[]'::jsonb,
  "source"     varchar(16) NOT NULL,
  "basis"      varchar(1000),
  "sourceUrl"  varchar(4000),
  "rubricYear" smallint NOT NULL DEFAULT 2026,
  "checkedAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinVideoPerf_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinVideoPerf_rubricYear" CHECK ("rubricYear" BETWEEN 2020 AND 2100),
  CONSTRAINT "CK_PinVideoPerf_scale" CHECK (
    ("resolution" IS NULL OR "resolution" BETWEEN 0 AND 5)
    AND ("duration" IS NULL OR "duration" BETWEEN 0 AND 5)
    AND ("audio" IS NULL OR "audio" BETWEEN 0 AND 5)
    AND ("speed" IS NULL OR "speed" BETWEEN 0 AND 5)
    AND ("control" IS NULL OR "control" BETWEEN 0 AND 5)
    AND ("realism" IS NULL OR "realism" BETWEEN 0 AND 5)
  )
);
