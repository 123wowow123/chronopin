-- The electricity a pin's facility uses in a year, in gigawatt-hours (1 TWh =
-- 1000 GWh): what a smelter, fab or plant draws over twelve months, as
-- against PinPower's capacity in megawatts. The pin page shows it and the
-- energy: search term and the TWh pills filter by it.
--
--   gwh        annual use in GWh, > 0. A range is stored as its headline
--              (upper) figure with the range in note.
--   basis      how the figure was arrived at:
--                'published'  a source states annual consumption;
--                'contracted' the volume of the power contracts, per year;
--                'calculated' megawatts x 8,760 hours, a ceiling at
--                             continuous running (the note says so).
--   sourceUrl  the page the figure (or its megawatts / contract) comes from.
--   note       the claim in words.
--
-- One row per pin. Like PinPower and PinEventInfo, Pin#update() never touches
-- it, so editing a pin cannot wipe it, and it is not in PinBaseView.
CREATE TABLE "PinEnergy" (
  "pinId"      integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "gwh"        numeric(14, 2) NOT NULL,
  "basis"      varchar(10) NOT NULL DEFAULT 'published',
  "sourceUrl"  varchar(4000),
  "note"       varchar(500),
  "checkedAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinEnergy_gwh" CHECK ("gwh" > 0),
  CONSTRAINT "CK_PinEnergy_basis" CHECK ("basis" IN ('published', 'contracted', 'calculated'))
);
