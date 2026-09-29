-- Sign in with Apple. Apple's subject is per-app, stable, and far longer than
-- the 25 characters the Facebook and Google ids fit in (001234.9f3a…c4d.1517),
-- so it gets its own wider column.
--
-- It is also the only identifier an Apple account is guaranteed to keep: a
-- "Hide My Email" relay address is not the address the account was opened
-- with, so sign-in looks the user up by this first and by email second.

ALTER TABLE "User" ADD COLUMN "appleId" varchar(255);

CREATE INDEX "User_appleId_idx" ON "User" ("appleId") WHERE "appleId" IS NOT NULL;
