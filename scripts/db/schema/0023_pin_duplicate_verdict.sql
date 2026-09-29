-- Claude's read on a suggested duplicate pair, from both pins and their
-- references: 'same' event, 'different' events, or 'unsure', with a sentence
-- or two on why. Advice for the people who decide the pair, never a decision
-- itself: "status" still only changes when someone confirms or rejects it.
-- Null until checked (or when the check could not run).

ALTER TABLE "PinDuplicate"
  ADD COLUMN "verdict"             varchar(20) CHECK ("verdict" IN ('same', 'different', 'unsure')),
  ADD COLUMN "verdictReasoning"    varchar(2000),
  ADD COLUMN "utcVerifiedDateTime" timestamptz;
