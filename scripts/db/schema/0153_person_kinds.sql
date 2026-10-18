-- Famous people who are not politicians have a page like a congressman's:
-- a business founder, an actor, an athlete, an author. The same facts
-- (age, religion, health, property, trips, earnings by year, sourced), with
-- roles, earning kinds and contribution kinds that fit their careers: a film
-- or an album where a politician has a law, endorsements and prize money where
-- a politician has a salary.
ALTER TABLE "Person" DROP CONSTRAINT "CK_Person_role";
ALTER TABLE "Person" ADD CONSTRAINT "CK_Person_role" CHECK ("role" IN (
  'president', 'vice-president', 'cabinet', 'senator', 'representative', 'governor', 'politician',
  'business', 'entertainment', 'sports', 'arts', 'science', 'media', 'other'));

ALTER TABLE "PersonEarning" DROP CONSTRAINT "CK_PersonEarning_kind";
ALTER TABLE "PersonEarning" ADD CONSTRAINT "CK_PersonEarning_kind" CHECK ("kind" IN (
  'salary', 'outside-income', 'royalties', 'investments', 'pension', 'endorsements', 'prize-money', 'business-income', 'other'));
-- "kind" was varchar(16): 'business-income' is 15, 'endorsements' 12 - fits.

ALTER TABLE "PersonContribution" DROP CONSTRAINT "CK_PersonContribution_kind";
ALTER TABLE "PersonContribution" ADD CONSTRAINT "CK_PersonContribution_kind" CHECK ("kind" IN (
  'law', 'bill', 'executive-order', 'committee', 'office', 'initiative', 'award', 'work', 'company', 'record', 'other'));
