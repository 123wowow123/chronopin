-- "Good for society" assessments of a person's contributions, on standard
-- welfare-economics criteria (src/lib/people.ts IMPACT_CRITERIA):
--   efficiency    net social benefit by cost-benefit analysis (Kaldor-Hicks)
--   externalities corrects a market failure: externality, public good,
--                 information asymmetry, market power
--   growth        effect on productivity and potential output
--   fiscal        effect on long-run fiscal sustainability
--   distortion    avoids (+) or creates (-) deadweight loss and rent-seeking
--   distribution  who gains and who loses (shown, never added into the
--                 meter: how to weigh it is a value judgment, not a finding)
-- Each criterion is scored -2 (clearly harms) .. +2 (clearly benefits) by what
-- the evidence says, with the evidence's URL (CBO/JCT/GAO scores, the IGM
-- economists panel, peer-reviewed studies), a confidence, and a flag when
-- credible sources disagree. Stored on the contribution, so it travels with it.
ALTER TABLE "PersonContribution"
  ADD COLUMN "impactScores"       jsonb,
  ADD COLUMN "impactConfidence"   varchar(8),
  ADD COLUMN "impactContested"    boolean NOT NULL DEFAULT false,
  ADD COLUMN "impactBasis"        text,
  ADD COLUMN "impactEvidenceUrl"  text,
  ADD COLUMN "impactAssessedDate" date,
  ADD CONSTRAINT "CK_PersonContribution_impactConfidence" CHECK ("impactConfidence" IS NULL OR "impactConfidence" IN ('high', 'medium', 'low')),
  ADD CONSTRAINT "CK_PersonContribution_impactEvidence" CHECK ("impactScores" IS NULL OR ("impactEvidenceUrl" LIKE 'https://%' AND "impactConfidence" IS NOT NULL));
