-- Light or dark colours, saved on the account so the choice follows a user to
-- other devices. NULL is "never chosen": the browser's own stored choice, or
-- the default (system), stands. 'system' follows the device's light/dark setting.

ALTER TABLE "User" ADD COLUMN "themePreference" varchar(10)
  CONSTRAINT "User_themePreference_check" CHECK ("themePreference" IN ('dark', 'light', 'system'));
