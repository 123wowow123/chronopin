-- Opt-in translation of sponsored headlines and body text. Source edits
-- invalidate cached translations in the same transaction as the edit.
ALTER TABLE "SponsoredAd"
  ADD COLUMN "autoTranslate" boolean NOT NULL DEFAULT false,
  ADD COLUMN "translations" jsonb NOT NULL DEFAULT '{}'::jsonb;
