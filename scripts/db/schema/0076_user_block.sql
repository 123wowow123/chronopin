-- One reader blocking another (Profile > Blocked, a comment's menu). It works
-- both ways for talk: neither sees the other's comments, neither can reply
-- to, react to or comment on the other's, and neither hears about the other
-- in the bell. The blocker also stops seeing the blocked person's pins.
-- Blocking ends any follow between them. The blocked person is never told.
CREATE TABLE "UserBlock" (
  "blockerId"          integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "blockedId"          integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("blockerId", "blockedId"),
  CONSTRAINT "CK_UserBlock_self" CHECK ("blockerId" <> "blockedId")
);
CREATE INDEX "IX_UserBlock_blockedId" ON "UserBlock" ("blockedId");
