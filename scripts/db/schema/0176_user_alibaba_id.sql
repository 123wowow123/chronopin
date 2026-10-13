-- Sign in with Alibaba Cloud. Its OIDC "sub" is an opaque, stable, per-app id,
-- and the flow never shares an email address, so this column is the only way
-- back to an account that was opened with it (the account's email stays null
-- until the person adds one on the profile page).

ALTER TABLE "User" ADD COLUMN "alibabaId" varchar(255);

CREATE INDEX "User_alibabaId_idx" ON "User" ("alibabaId") WHERE "alibabaId" IS NOT NULL;
