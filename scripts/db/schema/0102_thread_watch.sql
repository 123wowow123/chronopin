-- Watching a thread (the eye beside a pin page's Thread heading). A row names
-- the pin the reader watched it from; the thread is whatever chain that pin is
-- in when it is read, so a response posted later belongs to it too. Watching
-- the thread watches every pin in it (ordinary "Favorite" rows, which is what
-- the pins' alerts go by), and each new response that joins it is watched as
-- it arrives and told about in the bell ('thread'). Stopping takes the row
-- and those pins' watches away again.
CREATE TABLE "ThreadWatch" (
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "pinId"              integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "pinId")
);
CREATE INDEX "IX_ThreadWatch_pinId" ON "ThreadWatch" ("pinId");

-- One 'thread' notification per reader and new response.
CREATE UNIQUE INDEX "UX_Notification_thread" ON "Notification" ("userId", "pinId") WHERE "type" = 'thread';
