-- Chronopin's own probability per outcome row of the pin's market (a price ladder's "Above $3.00" strikes, a
-- field's candidates), shown as a column beside the market's percentage in the odds panel.
--   [{ "label": "Above $3.00", "probability": 63 }]   label = the market outcome's label exactly; 0-100.
ALTER TABLE "PinForecast" ADD COLUMN "outcomes" jsonb NOT NULL DEFAULT '[]'::jsonb;
