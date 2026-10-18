-- A message can answer an earlier one of the same chat (the composer's
-- "Replying to"); the answered message shows quoted above it. An unsent
-- original is quoted as unsent, and removing it clears the link.
ALTER TABLE "Message" ADD COLUMN "replyToId" integer REFERENCES "Message" ("id") ON DELETE SET NULL;
