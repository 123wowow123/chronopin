-- What a game pin's buyer wants to know before the trailer: how old a player
-- has to be and what the game supports. The pin page shows it under the
-- ratings (PinRating holds the aggregated scores).
--
--   maturityBoard   the rating board that gave the label: 'ESRB' or 'PEGI'.
--   maturityRating  its label as the board prints it ("Mature 17+", "18").
--   descriptors     the board's content descriptors (["Intense Violence",
--                   "Blood and Gore", ...]); empty when none were read.
--   platforms       fixed platform keys (src/lib/gameInfo.ts PLATFORMS), so
--                   the page's official logo lookup cannot miss on spelling.
--   source          'steam' (the store page's own data), 'wikidata',
--                   'session' (by hand in a Claude Code session) or 'hand'
--                   (a person; a refresh never overwrites it).
--   sourceUrl       the page it was read from.
--
-- One row per pin. Looked-up data like PinEventInfo and PinPlace: Pin#update()
-- never touches it. Not in PinBaseView - only the pin page reads it.
CREATE TABLE "PinGameInfo" (
  "pinId"          integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "maturityBoard"  varchar(8),
  "maturityRating" varchar(32),
  "descriptors"    jsonb NOT NULL DEFAULT '[]',
  "platforms"      jsonb NOT NULL DEFAULT '[]',
  "source"         varchar(16) NOT NULL,
  "sourceUrl"      varchar(4000),
  "checkedAt"      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinGameInfo_source" CHECK ("source" IN ('steam', 'wikidata', 'session', 'hand')),
  CONSTRAINT "CK_PinGameInfo_board" CHECK ("maturityBoard" IS NULL OR "maturityBoard" IN ('ESRB', 'PEGI')),
  CONSTRAINT "CK_PinGameInfo_descriptors" CHECK (jsonb_typeof("descriptors") = 'array'),
  CONSTRAINT "CK_PinGameInfo_platforms" CHECK (jsonb_typeof("platforms") = 'array')
);
