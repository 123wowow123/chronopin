-- Where a pin page view came from, the way "ShopClick" (0086) records a buy
-- click: the signed-in user, and the address either way. A view is still one
-- row per viewer per pin per UTC day (0014), so these are the day's first
-- view's.
--
-- The place is looked up from the address afterwards (src/server/ipLocation.ts,
-- when the admin Views page opens), so "country" is null until then. Views
-- recorded before this have neither address nor place.
ALTER TABLE "PinView" ADD COLUMN "userId" integer;
ALTER TABLE "PinView" ADD COLUMN "ip" inet;
-- Where the address places the view (DB-IP): ISO country code, region, city.
-- "located" is when that was looked up, set even when it found nothing.
ALTER TABLE "PinView" ADD COLUMN "country" varchar(2);
ALTER TABLE "PinView" ADD COLUMN "region" varchar(120);
ALTER TABLE "PinView" ADD COLUMN "city" varchar(120);
ALTER TABLE "PinView" ADD COLUMN "latitude" double precision;
ALTER TABLE "PinView" ADD COLUMN "longitude" double precision;
ALTER TABLE "PinView" ADD COLUMN "located" timestamptz;
-- Null on views recorded before this.
ALTER TABLE "PinView" ADD COLUMN "utcCreatedDateTime" timestamptz;
ALTER TABLE "PinView" ALTER COLUMN "utcCreatedDateTime" SET DEFAULT now();

UPDATE "PinView" SET "userId" = substring("viewer" FROM 3)::integer WHERE "viewer" ~ '^u:[0-9]+$';

CREATE INDEX "IX_PinView_unlocated" ON "PinView" ("ip") WHERE "located" IS NULL AND "ip" IS NOT NULL;
