-- A car performance rubric for a vehicle pin (a new EV, EREV or PHEV model):
-- six axes drawn as a radar on the pin page, the sibling of the taste radar
-- (PinTaste, 0157).
--
--   range, charging, acceleration, assistance, space, value
--                 0 to 5 in half steps, scored against the written rubric in
--                 docs/okf/scraping/strategy.md ("Car performance rubric").
--                 NULL means the spec for that axis is not published for this
--                 model: the radar draws the axis at the centre as "n/a" and
--                 leaves it out of the shape, never as a zero.
--   source        'session' (an editorial estimate made in a Claude Code
--                 session from the pin's own sourced specs) or 'hand' (a
--                 person; an estimate never overwrites it).
--   basis         one or two sentences naming the figures that drove each
--                 score, the variant scored, and any axis left null.
--   sourceUrl     the page the spec figures came from, when there is one.
--
-- These are estimates, not measurements: the pin page labels them so. One
-- row per pin. Looked-up data like PinTaste: Pin#update() never touches it,
-- and it is not in PinBaseView - only the pin page reads it.
CREATE TABLE "PinCarPerf" (
  "pinId"        integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "range"        numeric(2, 1),
  "charging"     numeric(2, 1),
  "acceleration" numeric(2, 1),
  "assistance"   numeric(2, 1),
  "space"        numeric(2, 1),
  "value"        numeric(2, 1),
  "source"       varchar(16) NOT NULL,
  "basis"        varchar(1000),
  "sourceUrl"    varchar(4000),
  "checkedAt"    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinCarPerf_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinCarPerf_scale" CHECK (
    ("range" IS NULL OR "range" BETWEEN 0 AND 5)
    AND ("charging" IS NULL OR "charging" BETWEEN 0 AND 5)
    AND ("acceleration" IS NULL OR "acceleration" BETWEEN 0 AND 5)
    AND ("assistance" IS NULL OR "assistance" BETWEEN 0 AND 5)
    AND ("space" IS NULL OR "space" BETWEEN 0 AND 5)
    AND ("value" IS NULL OR "value" BETWEEN 0 AND 5)
  )
);
