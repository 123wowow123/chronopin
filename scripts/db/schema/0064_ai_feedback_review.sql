-- The AI's review of a suggestion (0015). Anyone signed in can now suggest a
-- correction from a pin's own page, not only from the duplicate prompt, and
-- each suggestion is checked by Claude against the pin's source and
-- references, with web search for better ones.
--
-- The pin's own sources stay the truth: a suggestion is a lead, never an
-- edit. What the review changes on the pin is references - the pages it
-- fetched itself that back the suggestion - which move the pin's dates and
-- summary the way any other reference does. So:
--   applied    the review added at least one reference ("aiReferences")
--   dismissed  it found nothing that should change the pin
-- and "aiReasoning" says why, for the person who suggested it.
--
-- A row stays 'open' until a review finishes; "reviewAttempts" counts the
-- ones that failed on the suggestion itself (not on the API's credit), so
-- `npm run suggestions:review` stops retrying a hopeless one.

ALTER TABLE "AiFeedback"
  ADD COLUMN "aiVerdict"      varchar(20) CHECK ("aiVerdict" IN ('supported', 'partly', 'unsupported', 'unclear')),
  ADD COLUMN "aiReasoning"    varchar(4000),
  -- [{url, title, confidence}] for each reference the review added.
  ADD COLUMN "aiReferences"   jsonb,
  ADD COLUMN "aiModel"        varchar(100),
  ADD COLUMN "reviewAttempts" smallint NOT NULL DEFAULT 0;

-- A person's suggestions on one pin, for the list under the form.
CREATE INDEX "IX_AiFeedback_userId_pinId" ON "AiFeedback" ("userId", "pinId");
