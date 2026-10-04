-- A figure that is the company's own estimate rather than a paid amount (0127):
-- Tesla's 2025 CEO Performance Award is a "preliminary fair value estimate" in
-- its proxy, not an amount in the Summary Compensation Table. The panel marks
-- the person's total with an "Estimate" label and shows `estimateNote` (why,
-- and from where) in its info tooltip.
ALTER TABLE "CompanyExecutive"
  ADD COLUMN "estimated"    boolean NOT NULL DEFAULT false,
  ADD COLUMN "estimateNote" varchar(1000);
