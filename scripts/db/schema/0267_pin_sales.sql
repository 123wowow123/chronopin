-- Published sales figures for a product pin (a game's copies sold, a console's
-- shipments, a car's deliveries, a phone's revenue). Only a figure the
-- publisher or a reliable report stated is stored, each with its page and the
-- words it was read from; a product with no published number has no row.
--
--   metric      'units' (copies, shipments, deliveries) or 'revenue'.
--   value       the figure as stated (units: a count; revenue: an amount in
--               `currency`, no FX conversion).
--   currency    ISO code for revenue rows, NULL for units.
--   asOf        the date the figure was reported as of, NULL when only the
--               period label is known.
--   period      the label as printed ("as of Sep 30, 2025", "FY2025 Q3",
--               "first 4 days").
--   scope       the market it covers ("Worldwide", "United States").
--   sourceUrl   the page it was read from (required).
--   quote       the sentence it was read from.
--
-- Many rows per pin, newest first on the page. Like PinGameInfo: Pin#update()
-- never touches it and it is not in PinBaseView; only the pin page reads it.
CREATE TABLE "PinSales" (
  "id"        serial PRIMARY KEY,
  "pinId"     integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "metric"    varchar(8) NOT NULL,
  "value"     numeric(20, 2) NOT NULL,
  "currency"  varchar(3),
  "asOf"      date,
  "period"    varchar(80),
  "scope"     varchar(60),
  "sourceUrl" varchar(4000) NOT NULL,
  "quote"     varchar(500),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinSales_metric" CHECK ("metric" IN ('units', 'revenue')),
  CONSTRAINT "CK_PinSales_value" CHECK ("value" >= 0),
  CONSTRAINT "CK_PinSales_currency" CHECK (("metric" = 'revenue') = ("currency" IS NOT NULL))
);
CREATE INDEX "IX_PinSales_pinId" ON "PinSales" ("pinId", "asOf" DESC NULLS LAST, "id");
