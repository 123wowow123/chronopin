-- A reader who watches every person's stock trades at once (the People page
-- button), people added later included. Soft delete + revive, as PersonTradeWatch.
CREATE TABLE "PersonTradeWatchAll" (
  "userId"             integer PRIMARY KEY REFERENCES "User" ("id") ON DELETE CASCADE,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcDeletedDateTime" timestamptz
);
