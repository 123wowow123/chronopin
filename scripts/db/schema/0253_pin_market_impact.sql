-- How much a pin's information can move markets (equities, rates, commodities, crypto, FX).
--
--   weight   1-10. 1-2 barely registers, 3-4 sector news, 5-6 notable for a company or
--            commodity, 7-8 a major mover (earnings of a mega-cap, a central-bank decision,
--            a big regulatory ruling), 9-10 a market-wide shock. Only 3 and up count on the
--            timeline: the bag weight (src/lib/bagSample.ts) rises with it, and the card
--            shows a chart-line icon whose tooltip gives the score and the reason.
--   reason   one sentence, the mechanism ("Fed rate decision reprices the whole yield curve").
--   assets   optional: what moves ("S&P 500, USD, 10Y yield").
--   source   'hand' (a person or session scored it).
--
-- One row per pin. Like PinProject, Pin#update() never touches it, so an edit of the pin
-- cannot reset it. Set through PUT /api/admin/pins/:id/market-impact.
CREATE TABLE "PinMarketImpact" (
  "pinId"     integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "weight"    smallint NOT NULL,
  "reason"    varchar(500) NOT NULL,
  "assets"    varchar(200),
  "source"    varchar(8) NOT NULL DEFAULT 'hand',
  "checkedAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinMarketImpact_weight" CHECK ("weight" BETWEEN 1 AND 10),
  CONSTRAINT "CK_PinMarketImpact_source" CHECK ("source" IN ('hand'))
);
CREATE INDEX "IX_PinMarketImpact_weight" ON "PinMarketImpact" ("weight" DESC);
