-- Independent critic reviews for a pin that has no rubric table of its own: a
-- game, a film, a series, an album, a gadget. The sibling of the `reviews`
-- column the eight rubric tables keep (PinTaste, PinCarPerf, PinGasCarPerf,
-- PinAircraftPerf, PinLlmPerf, PinVideoPerf, PinHotel, PinDining), with the
-- same shape - [{url, title, publishedDate, quote, sentiment}] - so the pin's
-- "Sentiment over time" graph (src/components/pin/PinReviewSentiment.tsx) and
-- the news job's review scoring (src/server/jobs/reviewSentiment.ts) read it
-- like them.
--
--   reviews    pages that review THIS product (a critic's or tester's
--              write-up, not the announcement), each with a verbatim quote of
--              at most 300 characters, at most 8.
--   source     'session' (collected in a Claude Code session or a job) or
--              'hand' (a person; a collection never overwrites it).
--   basis      one or two sentences on how the reviews were chosen, and what
--              could not be found.
--   sourceUrl  the aggregate page the reviews were found from, if any.
--
-- One row per pin. Looked-up data like PinHotel: Pin#update() never touches it
-- and it is not in PinBaseView - only the pin page reads it.
CREATE TABLE "PinCriticReview" (
  "pinId"     integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "reviews"   jsonb NOT NULL DEFAULT '[]',
  "source"    varchar(16) NOT NULL DEFAULT 'session',
  "basis"     varchar(1000),
  "sourceUrl" varchar(4000),
  "checkedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinCriticReview_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinCriticReview_reviews" CHECK (jsonb_typeof("reviews") = 'array')
);
