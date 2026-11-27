-- Chronopin's own call on a market-predicted pin (Polymarket / Kalshi), written by the 06:00 and
-- 18:00 news job after it researches the question and reads related pins on the site.
--
--   outcome          the call in one line ("Likely above $2.40: the average has held $2.46 for three weeks").
--   probability      0-100, Chronopin's own estimate that the market's headline outcome happens (null = no number).
--   marketProbability the market's figure on the day of the call, so the gap is visible (null when unquoted).
--   reasoning        the case, sourced from pages the job opened, never a guess.
--   evidence         [{ "pinId": n, "note": "..." }], other pins on the site the call leans on (max 6).
--
-- One row per pin; Pin#update() never touches it. Set through PUT /api/pins/:id/forecast (admin).
CREATE TABLE "PinForecast" (
  "pinId"             integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "outcome"           varchar(200) NOT NULL,
  "probability"       smallint,
  "marketProbability" smallint,
  "reasoning"         varchar(1200) NOT NULL,
  "evidence"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "checkedAt"         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinForecast_probability" CHECK ("probability" IS NULL OR "probability" BETWEEN 0 AND 100),
  CONSTRAINT "CK_PinForecast_marketProbability" CHECK ("marketProbability" IS NULL OR "marketProbability" BETWEEN 0 AND 100)
);
