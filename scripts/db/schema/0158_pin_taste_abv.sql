-- A drink's alcohol by volume, in percent (6.5 for a 6.5% beer, 10.25 for
-- Pliny the Younger), shown beside its taste radar. Unlike the scores this is
-- a stated fact: set it only from a figure the maker or a credible page
-- publishes for that product, never for a range or lineup whose strength
-- varies. NULL for anything non-alcoholic or with no stated figure.
ALTER TABLE "PinTaste" ADD COLUMN "abv" numeric(5, 2);
ALTER TABLE "PinTaste" ADD CONSTRAINT "CK_PinTaste_abv" CHECK ("abv" IS NULL OR "abv" BETWEEN 0 AND 100);
