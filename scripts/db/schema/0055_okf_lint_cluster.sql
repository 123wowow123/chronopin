-- A 'cluster' okf:lint finding: an implausible number of pins sharing one start
-- date, which is what a scrape looks like when it invents a date.
--
-- On 2026-09-20 a Gear Patrol "September Week 2, 2026" roundup produced 71 pins
-- all dated 2026-09-08, 65 of them 'confirmed'. The roundup listed each product
-- as "already available"; the extractor read that as a release day and resolved
-- the roundup's week to its Monday. The pins' own sources were manufacturer
-- store pages carrying no date at all, so nothing on the page contradicted it,
-- and one pin ended up dated the day before its product was announced.
--
-- A count alone cannot find this: real clusters exist. A season's anime
-- premieres land on one simulcast day (ten pins, all from MyAnimeList), and a
-- month-only availability line legitimately puts a dozen pins on a month's last
-- day. What separates them is corroboration and honesty: a real cluster comes
-- from one aggregator, or is labelled 'estimated' because nobody claimed the
-- day. The invented one has many unrelated hosts and calls itself 'confirmed'.
-- So the check wants all three - volume, several distinct source hosts, and a
-- majority 'confirmed' - and the thresholds are set where the current corpus
-- produces no findings at all.

ALTER TABLE "OkfLintFinding" DROP CONSTRAINT IF EXISTS "CK_OkfLintFinding_check";
ALTER TABLE "OkfLintFinding" ADD CONSTRAINT "CK_OkfLintFinding_check"
  CHECK ("check" IN ('conformance', 'stale', 'orphan', 'quality', 'contradiction', 'imprecise', 'cluster'));
