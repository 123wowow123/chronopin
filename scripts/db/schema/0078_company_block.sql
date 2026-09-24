-- A reader blocking a company (a pin's three-dot menu): its pins are left out
-- of their timeline, search and "More like this", its new pins no longer
-- ring their bell, and a follow of it ends. Profile > Blocked lists it, with
-- Unblock. Nobody at the company is told.
CREATE TABLE "CompanyBlock" (
  "userId"             integer NOT NULL REFERENCES "User" ("id") ON DELETE CASCADE,
  "companyId"          integer NOT NULL REFERENCES "Company" ("id") ON DELETE CASCADE,
  "utcCreatedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("userId", "companyId")
);
