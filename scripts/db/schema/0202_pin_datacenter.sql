-- A data centre's (or industrial facility's) water consumption, AI chip
-- inventory, physical footprint, cooling architecture, and backup generators:
-- shown on the pin detail page and totalled in the map HUD.
--
--   waterGallonsPerDay  daily water draw in US gallons/day (1 MGD = 1,000,000).
--   waterBasis          'published' (operator/study), 'permitted' (withdrawal
--                       or treatment permit ceiling), or 'estimated' (modeled
--                       from MW at 0.45 L/kWh WUE, ~1,198 gal/day per MW).
--   chips               total AI accelerator chips (GPUs, TPUs, Trainium, etc.).
--   chipModel           accelerator model(s), e.g. 'NVIDIA B200, B300', 'TPU v5e'.
--   h100Equivalents     Epoch AI standardized H100-equivalent compute count.
--   acres               site land area in acres.
--   sqft                building floor space in square feet.
--   buildings           number of data halls / buildings on the campus.
--   generators          permitted backup diesel/gas generators on site.
--   cooling             cooling technology (e.g. 'Closed-loop water', 'Air-cooled').
--   powerSource         power supply (e.g. 'Natural gas (BTM)', 'Nuclear', 'PJM grid').
--   sourceUrl           the page or dataset that states the figures.
--   note                additional context in words.
--
-- One row per pin. Like PinPower and PinEnergy, Pin#update() never touches it.
CREATE TABLE "PinDatacenter" (
  "pinId"              integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "waterGallonsPerDay" numeric(14, 2),
  "waterBasis"         varchar(12),
  "chips"              bigint,
  "chipModel"          varchar(120),
  "h100Equivalents"    numeric(14, 2),
  "acres"              numeric(12, 2),
  "sqft"               bigint,
  "buildings"          integer,
  "generators"         integer,
  "cooling"            varchar(120),
  "powerSource"        varchar(200),
  "sourceUrl"          varchar(4000),
  "note"               varchar(500),
  "checkedAt"          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinDatacenter_water" CHECK ("waterGallonsPerDay" IS NULL OR "waterGallonsPerDay" > 0),
  CONSTRAINT "CK_PinDatacenter_waterBasis" CHECK ("waterBasis" IS NULL OR "waterBasis" IN ('published', 'permitted', 'estimated')),
  CONSTRAINT "CK_PinDatacenter_chips" CHECK ("chips" IS NULL OR "chips" > 0),
  CONSTRAINT "CK_PinDatacenter_h100" CHECK ("h100Equivalents" IS NULL OR "h100Equivalents" > 0),
  CONSTRAINT "CK_PinDatacenter_acres" CHECK ("acres" IS NULL OR "acres" > 0),
  CONSTRAINT "CK_PinDatacenter_sqft" CHECK ("sqft" IS NULL OR "sqft" > 0),
  CONSTRAINT "CK_PinDatacenter_buildings" CHECK ("buildings" IS NULL OR "buildings" > 0),
  CONSTRAINT "CK_PinDatacenter_generators" CHECK ("generators" IS NULL OR "generators" > 0)
);

