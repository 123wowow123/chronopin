-- Owner request: enable automatic translation for existing admin-owned ads.
-- Ordinary advertisers keep their saved choice. Future ads default to true
-- through 0185; owners can still switch translation off afterwards.
UPDATE "SponsoredAd" AS "ad"
SET "autoTranslate" = true, "utcUpdatedDateTime" = now()
FROM "User" AS "owner"
WHERE "ad"."userId" = "owner"."id"
  AND "owner"."role" = 'admin'
  AND NOT "ad"."autoTranslate";
