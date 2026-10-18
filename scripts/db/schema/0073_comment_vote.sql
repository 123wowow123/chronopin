-- Up and down votes on comments: one per person per comment, +1 or -1, and
-- taking a vote back deletes its row. A comment's score is read from these
-- (Comment.getByPinId) rather than kept on the comment, so a vote is one
-- small write and a withdrawn one leaves nothing behind. Nobody votes on
-- their own comment (the vote route refuses it).
CREATE TABLE "CommentVote" (
  "commentId"          integer NOT NULL REFERENCES "Comment" ("id") ON DELETE CASCADE,
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "value"              smallint NOT NULL CONSTRAINT "CK_CommentVote_value" CHECK ("value" IN (-1, 1)),
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("commentId", "userId")
);
CREATE INDEX "IX_CommentVote_userId" ON "CommentVote" ("userId");
