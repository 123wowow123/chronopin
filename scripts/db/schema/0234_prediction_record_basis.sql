-- How a PredictionRecord's odds were obtained: 'live' (read when the pin first
-- cited the market) or 'historical' (a market that had settled before it was
-- recorded, scored on its price 7 days before it closed, from the exchange's
-- price history; "utcSnapshotDateTime" is that moment). The two are shown and
-- scored separately on /predictions.
ALTER TABLE "PredictionRecord"
  ADD COLUMN "basis" varchar(10) NOT NULL DEFAULT 'live' CHECK ("basis" IN ('live', 'historical'));
