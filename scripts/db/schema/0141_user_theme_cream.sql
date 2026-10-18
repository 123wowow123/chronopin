-- A fourth theme, cream: the warm paper colors of the restaurant guide, for the whole site.

ALTER TABLE "User" DROP CONSTRAINT "User_themePreference_check";
ALTER TABLE "User" ADD CONSTRAINT "User_themePreference_check"
  CHECK ("themePreference" IN ('dark', 'light', 'cream', 'system'));
