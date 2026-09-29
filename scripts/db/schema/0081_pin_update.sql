-- What changed on a pin after it was posted, and why: the pin page's Updates
-- pane. One row per change - a reference someone added, a newer pin of the
-- same event fed in, an edit by its author or an admin, or the article
-- rewritten from its links - with the fields it moved, before and after.
-- The pin itself always shows the newest; these rows are how it got there.
--
-- kind:          'reference' | 'duplicate' | 'edit' | 'summary'
-- changes:       [{ field, before, after, allDay? }] - title, description,
--                longFormSummary, start, end (ISO instants), address, price
-- "references":  the links that brought it, [{ url, title, confidence,
--                publishedDate, startDate, endDate }]
-- relatedPinId:  for 'duplicate', the newer pin whose source it took in
-- note:          one sentence on what is new, when the rewrite gave one
--
-- Starts empty: nothing recorded what changed before it.
CREATE TABLE "PinUpdate" (
  "id"                 serial PRIMARY KEY,
  "pinId"              integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "kind"               varchar(16) NOT NULL CHECK ("kind" IN ('reference', 'duplicate', 'edit', 'summary')),
  "userId"             integer REFERENCES "User" ("id") ON DELETE SET NULL,
  "relatedPinId"       integer REFERENCES "Pin" ("id") ON DELETE SET NULL,
  "changes"            jsonb NOT NULL DEFAULT '[]',
  "references"         jsonb NOT NULL DEFAULT '[]',
  "note"               varchar(1000),
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "PinUpdate_pinId_idx" ON "PinUpdate" ("pinId", "utcCreatedDateTime" DESC);
