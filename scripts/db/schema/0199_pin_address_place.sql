-- PinAddressPlace: the country and city each pin's address names, with where its
-- pin sits, stored so the tag cloud's place map can count them in SQL.
--
-- A pin has no geocoded country or city: its address is one hand-written
-- line, and src/lib/city.ts reads the country and city off it. Doing that for
-- every live pin on each request (~20k rows, parsed in JS) was the place
-- cloud's whole cost. Rows here are filled by Pins.syncPlaces(), which finds
-- the pins with no row or a row made for another address or position and
-- reads only those, so every way a pin is written (API, scripts, admin) is
-- covered with no trigger. A table of its own, not columns on "Pin", so that
-- filling it fires none of the pin cache triggers.
--
-- If the reading in src/lib/city.ts changes, empty the table and it fills again.

CREATE TABLE "PinAddressPlace" (
  "pinId"   integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "address" text NOT NULL,
  "country" text,
  "city"    text,
  "lat"     double precision,
  "lon"     double precision
);

CREATE INDEX "IX_PinAddressPlace_country" ON "PinAddressPlace" ("country") WHERE "country" IS NOT NULL;
CREATE INDEX "IX_PinAddressPlace_city" ON "PinAddressPlace" ("city", "country") WHERE "city" IS NOT NULL;
