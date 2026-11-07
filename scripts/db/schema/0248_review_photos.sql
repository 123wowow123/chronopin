-- Reader-uploaded photos attached to a specific review, including dish reviews.
ALTER TABLE "PinPhoto" ADD COLUMN "reviewId" integer REFERENCES "PinReview" ("id") ON DELETE CASCADE;
CREATE INDEX "PinPhoto_review_idx" ON "PinPhoto" ("reviewId") WHERE "utcDeletedDateTime" IS NULL;
