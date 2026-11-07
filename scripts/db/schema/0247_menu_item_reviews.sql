-- Empty menuItem preserves existing whole-pin reviews and aggregates.
ALTER TABLE "PinReview" ADD COLUMN "menuItem" text NOT NULL DEFAULT '';
DROP INDEX "PinReview_pin_user_idx";
CREATE UNIQUE INDEX "PinReview_pin_user_idx" ON "PinReview" ("pinId", "userId", "menuItem") WHERE "utcDeletedDateTime" IS NULL;
