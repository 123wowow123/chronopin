-- An 'imprecise' okf:lint finding: a pin whose date is only as precise as the
-- year its source gave.
--
-- A bare year lands on 31 December by convention, which is a placeholder, not
-- a claim about the day. Such a pin is the best candidate in the corpus for a
-- second look: one later article naming the month or the day would replace a
-- whole year of uncertainty. The lint marks them so they can be worked through
-- deliberately rather than found by chance.

ALTER TABLE "OkfLintFinding" DROP CONSTRAINT IF EXISTS "CK_OkfLintFinding_check";
ALTER TABLE "OkfLintFinding" ADD CONSTRAINT "CK_OkfLintFinding_check"
  CHECK ("check" IN ('conformance', 'stale', 'orphan', 'quality', 'contradiction', 'imprecise'));
