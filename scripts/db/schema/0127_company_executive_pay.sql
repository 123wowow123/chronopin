-- The rest of an executive's pay beside salary and total (0125): the other
-- columns of the Summary Compensation Table, whole units of `currency` for the
-- same fiscal year. NULL where the filing does not have the column or it could
-- not be read; 0 where the filing shows a dash.
ALTER TABLE "CompanyExecutive"
  ADD COLUMN "bonus"             bigint CONSTRAINT "CK_CompanyExecutive_bonus" CHECK ("bonus" >= 0),
  ADD COLUMN "stockAwards"       bigint CONSTRAINT "CK_CompanyExecutive_stock" CHECK ("stockAwards" >= 0),
  ADD COLUMN "optionAwards"      bigint CONSTRAINT "CK_CompanyExecutive_option" CHECK ("optionAwards" >= 0),
  ADD COLUMN "incentivePay"      bigint CONSTRAINT "CK_CompanyExecutive_incentive" CHECK ("incentivePay" >= 0),
  ADD COLUMN "pensionChange"     bigint CONSTRAINT "CK_CompanyExecutive_pension" CHECK ("pensionChange" >= 0),
  ADD COLUMN "otherCompensation" bigint CONSTRAINT "CK_CompanyExecutive_other" CHECK ("otherCompensation" >= 0);
