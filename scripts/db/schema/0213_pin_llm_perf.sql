-- A language model version's rubric (the sibling of PinVideoPerf, 0212): six axes
-- drawn as a radar on the pin page.
--
--   reasoning, coding, context, price, speed, modalities
--                 0 to 5 in half steps, scored against the written rubric in
--                 docs/okf/scraping/strategy.md ("Language model rubric"). NULL
--                 means the spec is not published for this version.
--   rubricYear    the edition of the criteria the scores were set against.
--   reviews       independent reviews (tech press and hands-on tests), as PinCarPerf.reviews.
-- One row per pin; looked-up data, never touched by Pin#update().
CREATE TABLE "PinLlmPerf" (
  "pinId"      integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "reasoning"      numeric(2, 1),
  "coding"   numeric(2, 1),
  "context" numeric(2, 1),
  "speed"      numeric(2, 1),
  "price"     numeric(2, 1),
  "modalities"    numeric(2, 1),
  "reviews"    jsonb NOT NULL DEFAULT '[]'::jsonb,
  "source"     varchar(16) NOT NULL,
  "basis"      varchar(1000),
  "sourceUrl"  varchar(4000),
  "rubricYear" smallint NOT NULL DEFAULT 2026,
  "checkedAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinLlmPerf_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinLlmPerf_rubricYear" CHECK ("rubricYear" BETWEEN 2020 AND 2100),
  CONSTRAINT "CK_PinLlmPerf_scale" CHECK (
    ("reasoning" IS NULL OR "reasoning" BETWEEN 0 AND 5)
    AND ("coding" IS NULL OR "coding" BETWEEN 0 AND 5)
    AND ("context" IS NULL OR "context" BETWEEN 0 AND 5)
    AND ("speed" IS NULL OR "speed" BETWEEN 0 AND 5)
    AND ("price" IS NULL OR "price" BETWEEN 0 AND 5)
    AND ("modalities" IS NULL OR "modalities" BETWEEN 0 AND 5)
  )
);
