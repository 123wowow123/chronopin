-- A company's parent (Rockstar North -> Rockstar Games -> Take-Two), shown as
-- a tile in the company panel that searches for the parent. Found from
-- Wikidata's "parent organization" (P749) (`npm run companies:parents`); NULL with a check time means looked up and
-- none. The parent is a Company row of its own, made when first seen.
ALTER TABLE "Company"
  ADD COLUMN "parentCompanyId" integer REFERENCES "Company" ("id") ON DELETE SET NULL,
  ADD COLUMN "utcParentCheckedDateTime" timestamptz,
  ADD CONSTRAINT "CK_Company_parent_not_self" CHECK ("parentCompanyId" IS NULL OR "parentCompanyId" <> "id");
CREATE INDEX "IX_Company_parentCompanyId" ON "Company" ("parentCompanyId") WHERE "parentCompanyId" IS NOT NULL;
