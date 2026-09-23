-- When the account's email address was confirmed: the owner clicked the link
-- sent at sign-up (src/server/emailVerification.ts), or a social sign-in whose
-- provider vouches for the address opened the account. NULL is unconfirmed,
-- and an unconfirmed account can browse but not post pins or comments.
-- Changing the email clears it (updateUser in src/server/model/user.ts), so a
-- new address has to be confirmed again.
--
-- Every account that exists now predates the check - the curators' addresses
-- are not real mailboxes - so they count as confirmed from when they were
-- opened. A seed file from before this column does the same on restore.
ALTER TABLE "User"
  ADD COLUMN "emailVerifiedDateTime" timestamptz;

UPDATE "User" SET "emailVerifiedDateTime" = COALESCE("utcCreatedDateTime", now());
