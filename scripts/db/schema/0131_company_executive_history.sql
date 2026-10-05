-- The earlier years of the Summary Compensation Table beside the newest one
-- (0127): [{ "year": 2024, "total": 25717606, "stockAwards": 25345706 }, ...],
-- newest first, whole units of `currency`. Companies that grant stock in big
-- blocks (Amazon) show a near-salary total in the years between grants, so the
-- panel adds the years up and says when the last grant was. NULL where the
-- filing has one year only or the company's pay was added by hand.
ALTER TABLE "CompanyExecutive"
  ADD COLUMN "payHistory" jsonb;
