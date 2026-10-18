-- One live account per email and per @handle. Both columns are citext, so
-- "Ann@x.com" and "ann@x.com" collide. Soft-deleted accounts are left out, as
-- every lookup leaves them out. Sign-up and profile edits answer 409 with a
-- code when one of these is hit (src/server/model/user.ts takenField).

CREATE UNIQUE INDEX "User_email_key" ON "User" ("email")
  WHERE "email" IS NOT NULL AND "utcDeletedDateTime" IS NULL;
CREATE UNIQUE INDEX "User_userName_key" ON "User" ("userName")
  WHERE "utcDeletedDateTime" IS NULL;
