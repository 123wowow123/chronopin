-- A message's menu: its sender can unsend it (the text is wiped, and both
-- sides see that it was unsent), and the other side can report it for an
-- admin to review (Admin > Comments).
ALTER TABLE "Message" ADD COLUMN "utcUnsentDateTime" timestamptz;

ALTER TABLE "Message" DROP CONSTRAINT "CK_Message_body";
ALTER TABLE "Message" ADD CONSTRAINT "CK_Message_body"
  CHECK (("utcUnsentDateTime" IS NOT NULL AND "body" = '') OR char_length("body") BETWEEN 1 AND 4000);

-- One per person per message, a second changing the reason. "body" is the
-- text as reported, so an unsend does not take it from the admin.
CREATE TABLE "MessageReport" (
  "messageId"            integer NOT NULL REFERENCES "Message" ("id") ON DELETE CASCADE,
  "userId"               integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "reason"               varchar(20) NOT NULL
    CONSTRAINT "CK_MessageReport_reason" CHECK ("reason" IN ('spam', 'harassment', 'misleading', 'other')),
  "body"                 text NOT NULL,
  "utcCreatedDateTime"   timestamptz NOT NULL DEFAULT now(),
  "utcDismissedDateTime" timestamptz,
  "dismissedByUserId"    integer REFERENCES "User" ("id") ON DELETE SET NULL,
  PRIMARY KEY ("messageId", "userId")
);
CREATE INDEX "IX_MessageReport_open" ON "MessageReport" ("messageId") WHERE "utcDismissedDateTime" IS NULL;
