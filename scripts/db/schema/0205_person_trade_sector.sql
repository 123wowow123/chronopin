-- The sector of a traded holding that has no SEC filer to read one from (TickerSector): bonds and bond funds,
-- sector ETFs and mutual funds, foreign ADRs. Classified from the asset's name (sectorOfName in
-- src/lib/conflicts.ts); a TickerSector sector wins over this one.
ALTER TABLE "PersonTrade" ADD COLUMN "sector" varchar(30);
