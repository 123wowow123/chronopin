-- Editable ordinary menus, visit details and landing-page tiles. Existing
-- catalogs are imported once by migrate.ts in this migration's transaction.
CREATE TABLE "RestaurantContent" (
  "id" serial PRIMARY KEY,
  "sourceKey" text NOT NULL UNIQUE,
  "profile" jsonb NOT NULL CHECK (jsonb_typeof("profile") = 'object'),
  "enabled" boolean NOT NULL DEFAULT true,
  "revision" integer NOT NULL DEFAULT 1 CHECK ("revision" > 0),
  "userId" integer REFERENCES "User" ("id") ON DELETE SET NULL,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "RestaurantContent_region_idx" ON "RestaurantContent" (("profile"->'tile'->>'regionSlug')) WHERE "enabled";
