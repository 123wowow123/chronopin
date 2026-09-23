-- Reports of comments that break the site's rules, for an admin to review
-- (Admin > Reports). One per person per comment - reporting again just
-- changes the reason - and never on your own. A report stays open until an
-- admin deletes the comment or dismisses its reports; dismissing stamps the
-- open ones, and a report made after that opens the comment again.
CREATE TABLE "CommentReport" (
  "commentId"            integer NOT NULL REFERENCES "Comment" ("id") ON DELETE CASCADE,
  "userId"               integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "reason"               varchar(20) NOT NULL
    CONSTRAINT "CK_CommentReport_reason" CHECK ("reason" IN ('spam', 'harassment', 'misleading', 'other')),
  "utcCreatedDateTime"   timestamptz NOT NULL DEFAULT now(),
  "utcDismissedDateTime" timestamptz,
  "dismissedByUserId"    integer REFERENCES "User" ("id") ON DELETE SET NULL,
  PRIMARY KEY ("commentId", "userId")
);
CREATE INDEX "IX_CommentReport_open" ON "CommentReport" ("commentId") WHERE "utcDismissedDateTime" IS NULL;
