-- Dated holdings snapshots, kept separate from transaction disclosures.
CREATE TABLE "PersonHoldings" (
  "personId" integer PRIMARY KEY REFERENCES "Person" ("id") ON DELETE CASCADE,
  "portfolios" jsonb NOT NULL CHECK (jsonb_typeof("portfolios") = 'array'),
  "utcUpdatedDateTime" timestamptz NOT NULL DEFAULT now()
);
