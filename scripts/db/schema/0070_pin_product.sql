-- Which of its company's products a pin is about - the product line, not the
-- model (iPhone, not iPhone 18 Pro) - read in the same call that scores its
-- tone (src/server/extract/pinSentiment.ts), so a company search can graph
-- each major product's news on its own (src/lib/companySentiment.ts).
--
-- NULL product with a productHash: the pin is about the company as a whole
-- (results, layoffs, a lawsuit), or no one product. NULL productHash: never
-- read, e.g. scored by hand before this column, and waiting for the backfill
-- (npm run companies:sentiment -- --products).
ALTER TABLE "PinSentiment"
  ADD COLUMN "product"     citext NULL CHECK (length("product") BETWEEN 1 AND 80),
  ADD COLUMN "productHash" varchar(64) NULL;
CREATE INDEX "IX_PinSentiment_product" ON "PinSentiment" ("product") WHERE "product" IS NOT NULL;
