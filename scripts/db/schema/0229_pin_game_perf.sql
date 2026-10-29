-- A video game's rubric (the sibling of PinGasCarPerf, 0173): seven axes drawn
-- as a radar on the pin page.
--
--   gameplay, story, visuals, audio, content, polish, acclaim
--                 0 to 5 in half steps, scored against the written rubric in
--                 docs/okf/scraping/strategy.md ("Video game rubric"). NULL
--                 means the axis does not apply or no review speaks to it.
--   rubricYear    the era the scores are relative to: the game's own release
--                 year, so a 1995 "5" for visuals means best of 1995, never
--                 best of today. Scores are only comparable within one year.
-- One row per pin; the critic reviews it rests on are the pin's PinCriticReview
-- rows. Looked-up data, never touched by Pin#update().
CREATE TABLE "PinGamePerf" (
  "pinId"      integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "gameplay"   numeric(2, 1),
  "story"      numeric(2, 1),
  "visuals"    numeric(2, 1),
  "audio"      numeric(2, 1),
  "content"    numeric(2, 1),
  "polish"     numeric(2, 1),
  "acclaim"    numeric(2, 1),
  "source"     varchar(16) NOT NULL,
  "basis"      varchar(1000),
  "sourceUrl"  varchar(4000),
  "rubricYear" smallint NOT NULL,
  "checkedAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinGamePerf_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinGamePerf_rubricYear" CHECK ("rubricYear" BETWEEN 1970 AND 2100),
  CONSTRAINT "CK_PinGamePerf_scale" CHECK (
    ("gameplay" IS NULL OR "gameplay" BETWEEN 0 AND 5)
    AND ("story" IS NULL OR "story" BETWEEN 0 AND 5)
    AND ("visuals" IS NULL OR "visuals" BETWEEN 0 AND 5)
    AND ("audio" IS NULL OR "audio" BETWEEN 0 AND 5)
    AND ("content" IS NULL OR "content" BETWEEN 0 AND 5)
    AND ("polish" IS NULL OR "polish" BETWEEN 0 AND 5)
    AND ("acclaim" IS NULL OR "acclaim" BETWEEN 0 AND 5)
  )
);
