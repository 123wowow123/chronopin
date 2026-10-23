-- Reader reviews on a pin: a 1-5 star rating with an optional comment, one per
-- reader per pin (rating again replaces it). Shown on restaurant, travel,
-- activity, product, car and music pins and as a badge on their landing cards.
-- Deleting is soft so the history survives.
CREATE TABLE "PinReview" (
  "id"                 serial PRIMARY KEY,
  "pinId"              integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "stars"              smallint NOT NULL CHECK ("stars" BETWEEN 1 AND 5),
  "comment"            text,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcDeletedDateTime" timestamptz
);
CREATE UNIQUE INDEX "PinReview_pin_user_idx" ON "PinReview" ("pinId", "userId") WHERE "utcDeletedDateTime" IS NULL;
CREATE INDEX "PinReview_pin_idx" ON "PinReview" ("pinId", "utcCreatedDateTime" DESC) WHERE "utcDeletedDateTime" IS NULL;

-- A photo can carry its own rating (the dish or place it shows) and tags that
-- name a menu item and mark where on the picture it is:
--   tags  [{ "item": "Mapo tofu", "x": 0.12, "y": 0.30, "w": 0.25, "h": 0.2 }, ...]
--         x, y, w, h are fractions (0-1) of the image's width and height, so a
--         region survives any display size.
ALTER TABLE "PinPhoto"
  ADD COLUMN "stars" smallint CHECK ("stars" BETWEEN 1 AND 5),
  ADD COLUMN "tags"  jsonb NOT NULL DEFAULT '[]'::jsonb;
