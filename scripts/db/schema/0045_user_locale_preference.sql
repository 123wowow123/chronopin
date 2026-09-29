-- The language pages open in, saved on the account so the choice follows a
-- user to other devices, like themePreference (0012). NULL is "never chosen":
-- the browser's locale cookie, or Accept-Language on a first visit, stands.
-- Not the old "locale" column, which holds a social login's locale (en_US).

ALTER TABLE "User" ADD COLUMN "localePreference" varchar(5)
  CONSTRAINT "User_localePreference_check" CHECK ("localePreference" IN ('en', 'es', 'fr', 'de', 'ja', 'zh'));
