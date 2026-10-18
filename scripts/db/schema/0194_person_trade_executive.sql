-- Executive-branch periodic transaction reports (OGE Form 278-T: the president,
-- vice president, cabinet and other appointees) join the House and Senate
-- filings in PersonTrade. The filing id is the id of the report in OGE's PAS index.
ALTER TABLE "PersonTrade" DROP CONSTRAINT IF EXISTS "PersonTrade_chamber_check";
ALTER TABLE "PersonTrade" ALTER COLUMN "chamber" TYPE varchar(10);
ALTER TABLE "PersonTrade" ADD CONSTRAINT "PersonTrade_chamber_check" CHECK ("chamber" IN ('house', 'senate', 'executive'));
