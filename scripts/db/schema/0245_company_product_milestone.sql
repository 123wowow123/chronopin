-- The major events of a product: a listed pin flagged as a milestone (a launch,
-- an unveiling, a first) with a short label ("Unveiled", "Paid rides begin").
-- Product pages and the hub show only these in their picture walls and mark them
-- on the timeline; the rest of the product's pins stay in its lists.
ALTER TABLE "CompanyProductPin" ADD COLUMN "milestoneLabel" varchar(80);
