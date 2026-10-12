-- The edition of the criteria a car performance rubric was scored against.
-- The anchors in docs/okf/scraping/strategy.md ("Car performance rubric") get
-- tighter as the market moves (a 2026 "5" for range is a 2028 "4"), so a score
-- is only comparable with scores of the same year. Every row so far was scored
-- against the 2026 anchors, which is what the default records; a re-score
-- against a later edition overwrites the row with that year, and a row scored
-- under an older edition is kept, labelled, not rescored silently.
--
-- The current edition is CAR_PERF_RUBRIC_YEAR in src/lib/pinCarPerf.ts; the
-- application writes it on every insert, so the default only backfills.
ALTER TABLE "PinCarPerf" ADD COLUMN "rubricYear" smallint NOT NULL DEFAULT 2026;
ALTER TABLE "PinCarPerf" ADD CONSTRAINT "CK_PinCarPerf_rubricYear" CHECK ("rubricYear" BETWEEN 2020 AND 2100);
