-- An airliner variant's rubric (the sibling of PinGasCarPerf, 0173): six axes
-- drawn as a radar on the pin page.
--
--   range, capacity, efficiency, speed, runway, comfort
--                 0 to 5 in half steps, scored against the written rubric in
--                 docs/okf/scraping/strategy.md ("Airliner rubric"). NULL
--                 means the spec is not published for this variant.
--   rubricYear    the edition of the criteria the scores were set against.
--   reviews       independent reviews (pilot and press), as PinCarPerf.reviews.
-- One row per pin; looked-up data, never touched by Pin#update().
CREATE TABLE "PinAircraftPerf" (
  "pinId"      integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "range"      numeric(2, 1),
  "capacity"   numeric(2, 1),
  "efficiency" numeric(2, 1),
  "speed"      numeric(2, 1),
  "runway"     numeric(2, 1),
  "comfort"    numeric(2, 1),
  "reviews"    jsonb NOT NULL DEFAULT '[]'::jsonb,
  "source"     varchar(16) NOT NULL,
  "basis"      varchar(1000),
  "sourceUrl"  varchar(4000),
  "rubricYear" smallint NOT NULL DEFAULT 2026,
  "checkedAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinAircraftPerf_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinAircraftPerf_rubricYear" CHECK ("rubricYear" BETWEEN 2020 AND 2100),
  CONSTRAINT "CK_PinAircraftPerf_scale" CHECK (
    ("range" IS NULL OR "range" BETWEEN 0 AND 5)
    AND ("capacity" IS NULL OR "capacity" BETWEEN 0 AND 5)
    AND ("efficiency" IS NULL OR "efficiency" BETWEEN 0 AND 5)
    AND ("speed" IS NULL OR "speed" BETWEEN 0 AND 5)
    AND ("runway" IS NULL OR "runway" BETWEEN 0 AND 5)
    AND ("comfort" IS NULL OR "comfort" BETWEEN 0 AND 5)
  )
);
