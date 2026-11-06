-- A company's revenue by reporting segment and quarter, each figure taken from
-- the results pin that reports it (pinId). Shown as the "Earnings by segment"
-- pane on a company's landing page. Amounts are US dollars in billions, as the
-- pin states them (no conversion, nothing estimated).
CREATE TABLE IF NOT EXISTS "CompanySegmentRevenue" (
  "companyId" integer NOT NULL REFERENCES "Company"("id") ON DELETE CASCADE,
  "periodEnd" date NOT NULL,
  "period" varchar(20) NOT NULL,
  "segment" varchar(80) NOT NULL,
  "amountBillions" numeric(8, 2) NOT NULL,
  "pinId" integer REFERENCES "Pin"("id") ON DELETE SET NULL,
  PRIMARY KEY ("companyId", "periodEnd", "segment")
);
