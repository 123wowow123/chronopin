-- The Amazon Associates Japan tracking id (affiliate.amazon.co.jp), so the
-- Japan ads of 0118 serve on a fresh deploy without typing it into the admin
-- Ads page. It is merged into AppSetting "amazonTags", leaving any other
-- store's id, and a Japan id an admin has already set, as they are.
INSERT INTO "AppSetting" ("key", "value", "utcUpdatedDateTime")
VALUES ('amazonTags', '{"JP": "chronopinawza-22"}'::jsonb, now())
ON CONFLICT ("key") DO UPDATE
  SET "value" = '{"JP": "chronopinawza-22"}'::jsonb || "AppSetting"."value", "utcUpdatedDateTime" = now()
  WHERE NOT ("AppSetting"."value" ? 'JP');
