-- Some disclosed transactions are not a purchase, sale or exchange: a total return swap on an
-- OGE 278-T has no type ("See Endnote"), no amount ("value not readily ascertainable") and
-- an endnote giving its terms. They are stored as txType 'other' with the amount left NULL
-- and the endnote kept in "note", so nothing is invented to fit the table.
ALTER TABLE "PersonTrade" DROP CONSTRAINT IF EXISTS "PersonTrade_txType_check";
ALTER TABLE "PersonTrade" ADD CONSTRAINT "PersonTrade_txType_check" CHECK ("txType" IN ('purchase', 'sale', 'partial', 'exchange', 'other'));
ALTER TABLE "PersonTrade" ADD COLUMN "note" text;
