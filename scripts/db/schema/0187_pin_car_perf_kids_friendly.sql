-- Adds the kidsFriendly axis to PinCarPerf and PinGasCarPerf, scored 0-5 in
-- half steps (or NULL when not evaluated or not applicable), representing
-- suitability for children and families (ISOFIX child seat anchors, rear cabin
-- space, climate control, rear entertainment, child presence detection, and
-- stroller cargo capacity).

ALTER TABLE "PinCarPerf" ADD COLUMN "kidsFriendly" numeric(2, 1);
ALTER TABLE "PinCarPerf" DROP CONSTRAINT IF EXISTS "CK_PinCarPerf_scale";
ALTER TABLE "PinCarPerf" ADD CONSTRAINT "CK_PinCarPerf_scale" CHECK (
  ("range" IS NULL OR "range" BETWEEN 0 AND 5)
  AND ("charging" IS NULL OR "charging" BETWEEN 0 AND 5)
  AND ("acceleration" IS NULL OR "acceleration" BETWEEN 0 AND 5)
  AND ("assistance" IS NULL OR "assistance" BETWEEN 0 AND 5)
  AND ("space" IS NULL OR "space" BETWEEN 0 AND 5)
  AND ("value" IS NULL OR "value" BETWEEN 0 AND 5)
  AND ("kidsFriendly" IS NULL OR "kidsFriendly" BETWEEN 0 AND 5)
);

ALTER TABLE "PinGasCarPerf" ADD COLUMN "kidsFriendly" numeric(2, 1);
ALTER TABLE "PinGasCarPerf" DROP CONSTRAINT IF EXISTS "CK_PinGasCarPerf_scale";
ALTER TABLE "PinGasCarPerf" ADD CONSTRAINT "CK_PinGasCarPerf_scale" CHECK (
  ("power" IS NULL OR "power" BETWEEN 0 AND 5)
  AND ("acceleration" IS NULL OR "acceleration" BETWEEN 0 AND 5)
  AND ("economy" IS NULL OR "economy" BETWEEN 0 AND 5)
  AND ("handling" IS NULL OR "handling" BETWEEN 0 AND 5)
  AND ("space" IS NULL OR "space" BETWEEN 0 AND 5)
  AND ("value" IS NULL OR "value" BETWEEN 0 AND 5)
  AND ("kidsFriendly" IS NULL OR "kidsFriendly" BETWEEN 0 AND 5)
);

