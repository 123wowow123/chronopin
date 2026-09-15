-- Comment notifications. A 'comment' tells a pin's author someone commented on
-- it; a 'reply' tells a comment's author someone replied to them. Both point
-- at the new comment, so deleting that comment can take them back and the
-- bell can link straight to it.

ALTER TABLE "Notification" ADD COLUMN "commentId" integer;

CREATE INDEX "IX_Notification_commentId" ON "Notification" ("commentId") WHERE "commentId" IS NOT NULL;
