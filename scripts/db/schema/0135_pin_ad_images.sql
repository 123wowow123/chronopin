-- A chosen product ad must show its own listing image, not the linked pin's
-- lead image or video still, which can depict an entirely different subject.
ALTER TABLE "PinAd" ADD COLUMN "image" text;

UPDATE "PinAd" AS "a"
SET "image" = "p"."image"
FROM "ProductAd" AS "p"
WHERE "p"."asin" = "a"."asin" AND "p"."status" = 'ok';
