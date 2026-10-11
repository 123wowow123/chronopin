-- The page that states a drink's alcohol by volume, when it is not the pin's
-- own source (a trade-press article naming the product's strength, or the
-- brewery's page for the beer an event pin is about). The pin page cites it
-- beside the ABV. NULL means the pin's sourceUrl states it.
ALTER TABLE "PinTaste" ADD COLUMN "abvSourceUrl" varchar(4000);
