-- A taste profile for a consumable product pin (a snack, a drink, a food
-- product): five axes drawn as a radar on the pin page, as Japanese tea and
-- sake guides print them.
--
--   aroma, bitterness, sweetness, astringency, umami
--                 0 to 5 in half steps. 0 is "none to speak of", 5 is the
--                 top of the chart.
--   source        'session' (an editorial estimate made in a Claude Code
--                 session from the pin's own sourced text) or 'hand' (a
--                 person; an estimate never overwrites it).
--   basis         one sentence on what the estimate rests on (the tasting
--                 notes, ingredients or style it was read from).
--   sourceUrl     the page the basis came from, when there is one.
--
-- These are estimates, not measurements: the pin page labels them so. One
-- row per pin. Looked-up data like PinGameInfo: Pin#update() never touches
-- it, and it is not in PinBaseView - only the pin page reads it.
CREATE TABLE "PinTaste" (
  "pinId"       integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "aroma"       numeric(2, 1) NOT NULL,
  "bitterness"  numeric(2, 1) NOT NULL,
  "sweetness"   numeric(2, 1) NOT NULL,
  "astringency" numeric(2, 1) NOT NULL,
  "umami"       numeric(2, 1) NOT NULL,
  "source"      varchar(16) NOT NULL,
  "basis"       varchar(1000),
  "sourceUrl"   varchar(4000),
  "checkedAt"   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinTaste_source" CHECK ("source" IN ('session', 'hand')),
  CONSTRAINT "CK_PinTaste_scale" CHECK (
    "aroma" BETWEEN 0 AND 5 AND "bitterness" BETWEEN 0 AND 5 AND "sweetness" BETWEEN 0 AND 5
    AND "astringency" BETWEEN 0 AND 5 AND "umami" BETWEEN 0 AND 5
  )
);
