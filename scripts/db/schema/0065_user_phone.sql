-- A phone number, asked for (and skippable) on the sign-up page and editable
-- on the profile. NULL is "not given", as it is for the birthday (0058):
-- nothing on the site requires it, so nothing may assume it is there.
--
-- Stored as the user typed it, whitespace tidied, since there is no country
-- to read an unprefixed number against. What counts as a number (7 to 15
-- digits, E.164's ceiling) is checked in the app (src/lib/phone.ts); the
-- column only holds the length that rule allows.
ALTER TABLE "User" ADD COLUMN "phone" text
  CONSTRAINT "User_phone_check" CHECK (char_length("phone") BETWEEN 7 AND 32);
