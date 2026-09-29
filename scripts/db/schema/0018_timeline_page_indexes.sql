-- Paging the timeline off "Pin" rather than "PinBaseView".
--
-- A timeline page used to LIMIT the view, but the view groups and carries
-- correlated subqueries, so the limit could not be pushed into the scan:
-- Postgres built every pin past the cursor - its references, ratings, view
-- count and duplicate group - and then threw all but a page away. A page cost
-- 1.6ms from the newest pin and 120ms from the oldest, growing with the table
-- rather than with the page.
--
-- Pins.queryPage now picks a page of ids off "Pin" first (the keyset walk
-- IX_Pin_utcStartDateTime already serves) and only then reads those pins out
-- of the view, the same two steps search has always taken (rankSearch, then
-- querySearchRanked). The indexes below are what let that first step, and the
-- category counts beside it, run without touching the view at all.

-- "Favorite" and "Like" are unique on ("userId", "pinId"), which answers "has
-- this viewer watched this pin" but not "who watched this one" - the way
-- PinBaseView joins both, and the way a watched timeline finds its pins.
CREATE INDEX "IX_Favorite_pinId" ON "Favorite" ("pinId") WHERE "utcDeletedDateTime" IS NULL;
CREATE INDEX "IX_Like_pinId" ON "Like" ("pinId") WHERE "utcDeletedDateTime" IS NULL;

-- The category pills group by this, and a search's category: terms filter by
-- it. citext, so the index is already case-insensitive.
CREATE INDEX "IX_Pin_category" ON "Pin" ("category");

-- A search's user: terms resolve a name to an id and then read that author's
-- pins; neither side had an index.
CREATE INDEX "IX_Pin_userId" ON "Pin" ("userId");
CREATE INDEX "IX_User_userName" ON "User" ("userName");
