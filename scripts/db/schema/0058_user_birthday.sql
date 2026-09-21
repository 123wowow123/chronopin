-- The day a user was born, asked for (and skippable) on the sign-up page and
-- editable on the profile. NULL is "not given", which most accounts will be:
-- nothing on the site requires it, so nothing may assume it is there.
--
-- A `date`, not a timestamp: a birthday is a day, and the same day wherever
-- the reader is. Read it with to_char (as 0042's originalStartDate is), since
-- pg hands a bare date back as the server's own local midnight.
--
-- The floor is a sanity bound - the oldest person ever verified reached 122 -
-- and it is all a CHECK can hold: CURRENT_DATE is not immutable, so "not in
-- the future" is checked in the app (src/lib/birthday.ts).
ALTER TABLE "User" ADD COLUMN "birthday" date
  CONSTRAINT "User_birthday_check" CHECK ("birthday" >= DATE '1900-01-01');
