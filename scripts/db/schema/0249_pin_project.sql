-- A building project's headline quantities, shown as a spec panel on the pin page
-- (the way PinDatacenter does for data centres): homes, hotel rooms, seats, height,
-- floor area, site area and parking.
--
--   units            homes / apartments / condos / townhomes.
--   affordableUnits  how many of `units` are income-restricted.
--   rooms            hotel rooms or keys.
--   seats            stadium / arena / theatre capacity.
--   beds             hospital, student-housing or senior-living beds.
--   stories          floors above ground.
--   sqft             gross floor area in square feet.
--   acres            site area in acres.
--   parking          parking spaces.
--   source           'title' (read off the pin's title by the backfill) or 'hand'
--                    (set from sourceUrl by a person or session; a title write never replaces it).
--   basis            'published' (the source states it), 'planned' (design figure for an
--                    unbuilt project) or 'reported' (press report of a proposal).
--   sourceUrl        the page that states the figures.
--   note             what the numbers are, in words.
--
-- One row per pin. Like PinDatacenter, Pin#update() never touches it.
CREATE TABLE "PinProject" (
  "pinId"           integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "units"           integer,
  "affordableUnits" integer,
  "rooms"           integer,
  "seats"           integer,
  "beds"            integer,
  "stories"         integer,
  "sqft"            bigint,
  "acres"           numeric(12, 2),
  "parking"         integer,
  "source"          varchar(8) NOT NULL DEFAULT 'hand',
  "basis"           varchar(10),
  "sourceUrl"       varchar(4000),
  "note"            varchar(500),
  "checkedAt"       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinProject_positive" CHECK (
    ("units" IS NULL OR "units" > 0) AND ("affordableUnits" IS NULL OR "affordableUnits" > 0)
    AND ("rooms" IS NULL OR "rooms" > 0) AND ("seats" IS NULL OR "seats" > 0) AND ("beds" IS NULL OR "beds" > 0)
    AND ("stories" IS NULL OR "stories" > 0) AND ("sqft" IS NULL OR "sqft" > 0)
    AND ("acres" IS NULL OR "acres" > 0) AND ("parking" IS NULL OR "parking" > 0)),
  CONSTRAINT "CK_PinProject_affordable" CHECK ("affordableUnits" IS NULL OR "units" IS NULL OR "affordableUnits" <= "units"),
  CONSTRAINT "CK_PinProject_source" CHECK ("source" IN ('title', 'hand')),
  CONSTRAINT "CK_PinProject_basis" CHECK ("basis" IS NULL OR "basis" IN ('published', 'planned', 'reported'))
);
