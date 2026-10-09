-- A product's published score for the /products page when its pin has no
-- PinRating rows of its own: the score, its scale, who gave it and where.
ALTER TABLE "ProductBlurb"
  ADD COLUMN "ratingScore"  numeric(6, 2),
  ADD COLUMN "ratingMax"    numeric(6, 2),
  ADD COLUMN "ratingSource" varchar(80),
  ADD COLUMN "ratingUrl"    varchar(4000),
  ADD CONSTRAINT "CK_ProductBlurb_rating" CHECK (
    ("ratingScore" IS NULL AND "ratingMax" IS NULL AND "ratingSource" IS NULL)
    OR ("ratingScore" IS NOT NULL AND "ratingMax" > 0 AND "ratingScore" BETWEEN 0 AND "ratingMax" AND "ratingSource" IS NOT NULL)
  );
