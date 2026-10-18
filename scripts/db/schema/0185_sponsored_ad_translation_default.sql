-- New ads translate automatically unless explicitly disabled. Existing ads
-- retain the choice already saved by their owner.
ALTER TABLE "SponsoredAd" ALTER COLUMN "autoTranslate" SET DEFAULT true;
