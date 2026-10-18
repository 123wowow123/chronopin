-- Korean joins the languages a pin can be translated into (0044) and a user
-- can choose (0045).

ALTER TABLE "PinTranslation" DROP CONSTRAINT "PinTranslation_locale";
ALTER TABLE "PinTranslation" ADD CONSTRAINT "PinTranslation_locale" CHECK ("locale" IN ('es', 'fr', 'de', 'ja', 'zh', 'ko'));

ALTER TABLE "User" DROP CONSTRAINT "User_localePreference_check";
ALTER TABLE "User" ADD CONSTRAINT "User_localePreference_check" CHECK ("localePreference" IN ('en', 'es', 'fr', 'de', 'ja', 'zh', 'ko'));
