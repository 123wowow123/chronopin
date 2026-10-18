-- Runtime-managed restaurant offers. JSONB retains menu samples, provenance,
-- photos, ratings, and local-time schedules without losing the curated data.
CREATE TABLE "RestaurantSpecialVenue" (
  "id" serial PRIMARY KEY,
  "sourceKey" text NOT NULL UNIQUE,
  "regionSlug" text,
  "profile" jsonb NOT NULL CHECK (jsonb_typeof("profile") = 'object'),
  "enabled" boolean NOT NULL DEFAULT true,
  "revision" integer NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "userId" integer REFERENCES "User" ("id") ON DELETE SET NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "RestaurantSpecialVenue_region_idx" ON "RestaurantSpecialVenue" ("regionSlug") WHERE "enabled";
