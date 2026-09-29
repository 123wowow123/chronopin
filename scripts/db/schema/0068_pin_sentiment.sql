-- How a pin reads as news for its company, from -1 (a recall, a delay, a
-- lawsuit, a loss) through 0 (routine, neutral) to 1 (a launch, a record, a
-- win). Claude scores it from the pin's title and summary
-- (src/server/extract/pinSentiment.ts); a company search graphs its pins'
-- scores over time beside its comments' (src/lib/companySentiment.ts).
--
-- Its own table, like PinRating: the edit form writes every Pin column, so a
-- score kept on Pin would be wiped by the first edit. textHash is the text the
-- score was read from; an edit that changes it is scored again.
CREATE TABLE "PinSentiment" (
  "pinId"             integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "sentiment"         real NOT NULL CHECK ("sentiment" BETWEEN -1 AND 1),
  "textHash"          varchar(64) NOT NULL,
  "utcScoredDateTime" timestamptz NOT NULL DEFAULT now()
);
