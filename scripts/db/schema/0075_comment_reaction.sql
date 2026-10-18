-- Reactions on comments, as Facebook has them, in place of 0073's up and down
-- votes: one reaction per person per comment - like, love, haha, wow, sad or
-- angry - and taking it back deletes the row. Each kind is counted apart
-- (Comment.getByPinId), and anyone may react to their own comment.
CREATE TABLE "CommentReaction" (
  "commentId"          integer NOT NULL REFERENCES "Comment" ("id") ON DELETE CASCADE,
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "reaction"           varchar(10) NOT NULL
    CONSTRAINT "CK_CommentReaction_reaction" CHECK ("reaction" IN ('like', 'love', 'haha', 'wow', 'sad', 'angry')),
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("commentId", "userId")
);
CREATE INDEX "IX_CommentReaction_userId" ON "CommentReaction" ("userId");

-- An up vote was a like; a down vote has no reaction of its own.
INSERT INTO "CommentReaction" ("commentId", "userId", "reaction", "utcCreatedDateTime", "utcUpdatedDateTime")
SELECT "commentId", "userId", 'like', "utcCreatedDateTime", "utcUpdatedDateTime" FROM "CommentVote" WHERE "value" = 1;

DROP TABLE "CommentVote";
