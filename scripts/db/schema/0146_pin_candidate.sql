-- The contenders an awards pin lists: for the Grammys' "big four" (Record,
-- Album, Song of the Year and Best New Artist), who is expected to be
-- nominated or to win, each linked to the pin for their work.
--
--   category    one of 'record', 'album', 'song', 'artist' (the big four).
--   rank        1 = the market's or press's favourite; unique per category.
--   name        the candidate as the category names it: the record, the
--               album, the song or the artist.
--   artist      who made it (NULL for Best New Artist, where name is them).
--   workPinId   the pin for that work (the album's release, the single's
--               chart debut, the artist's breakout). SET NULL if it goes.
--   odds        the market's price for it in cents (0-100), NULL when none.
--   oddsLabel   what the price is for: 'nominee' or 'winner'.
--   sourceUrl   where the contender and its price were read.
--   asOf        the day they were read; a price goes stale.
--
-- Looked-up data like PinEventInfo: Pin#update() never touches it, and it is
-- not in PinBaseView - only the pin page reads it.
CREATE TABLE "PinCandidate" (
  "id"         serial PRIMARY KEY,
  "pinId"      integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "category"   varchar(8) NOT NULL,
  "rank"       smallint NOT NULL,
  "name"       varchar(200) NOT NULL,
  "artist"     varchar(200),
  "workPinId"  integer REFERENCES "Pin" ("id") ON DELETE SET NULL,
  "odds"       smallint,
  "oddsLabel"  varchar(8),
  "sourceUrl"  varchar(4000),
  "asOf"       date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT "CK_PinCandidate_category" CHECK ("category" IN ('record', 'album', 'song', 'artist')),
  CONSTRAINT "CK_PinCandidate_odds" CHECK ("odds" IS NULL OR ("odds" BETWEEN 0 AND 100)),
  CONSTRAINT "CK_PinCandidate_oddsLabel" CHECK ("oddsLabel" IS NULL OR "oddsLabel" IN ('nominee', 'winner')),
  CONSTRAINT "UX_PinCandidate_rank" UNIQUE ("pinId", "category", "rank")
);
CREATE INDEX "IX_PinCandidate_workPinId" ON "PinCandidate" ("workPinId");
