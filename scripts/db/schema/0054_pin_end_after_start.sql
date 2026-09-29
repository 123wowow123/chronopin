-- A pin's end must come after its start. Nothing enforced that, and on
-- 2026-09-20 a contradiction check found pin 224 (Sydney Metro West) starting
-- 2032-12-31 and ending 2032-06-02 - seven months before it began.
--
-- That end is the *other* Sydney Metro West pin's date. The line was pinned
-- twice, once at 2032-06-01 and once at the 2032 year-end placeholder, and the
-- earlier pin's exclusive end (2032-06-02) ended up on the later pin. The two
-- are the pair that MAX_DAYS_APART_ESTIMATED in services/duplicatePin.ts was
-- widened to catch, so the pins were already known to be about one opening.
--
-- The repair nulls any end that does not follow its start rather than guessing
-- a replacement: for a single all-day pin sitting on a year-end placeholder, no
-- end is the honest answer, and the date the pin means is its start.
--
-- The constraint allows a null end (most pins have none) and requires a strict
-- increase, which is what the all-day convention already produces: an all-day
-- pin runs 00:00Z to the exclusive 00:00Z of a later day, never the same
-- instant. See CK_Pin_allDayUtcMidnight (0011) for the companion rule.
UPDATE "Pin"
  SET "utcEndDateTime" = NULL
  WHERE "utcEndDateTime" IS NOT NULL
    AND "utcEndDateTime" <= "utcStartDateTime";

ALTER TABLE "Pin"
  ADD CONSTRAINT "CK_Pin_endAfterStart"
  CHECK ("utcEndDateTime" IS NULL OR "utcEndDateTime" > "utcStartDateTime");
