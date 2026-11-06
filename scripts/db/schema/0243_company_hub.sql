-- A company's landing ("hub") pin and its tree of products.
--
-- A hub pin is a normal Pin that is kept up to date rather than dated once: it
-- never appears on the main timeline (the page queries leave it out) and is
-- reached from the company page and search. Its pin page shows the company
-- tree - products, and products inside products - each with the dated thread
-- of pins about it.
--
--   CompanyHub      one hub pin per company, and a pin is the hub of at most one.
--   CompanyProduct  a node of the tree. parentId NULL = top level under the
--                   company. rank orders siblings.
--   CompanyProductPin  the pins a product lists: each is any pin of a thread,
--                   and the page shows that whole thread (walked from the pin),
--                   so a product with several threads or lone pins lists each.
--
-- Looked-up data like PinCompetitor: Pin#update() never touches either table
-- and neither is in PinBaseView, so a pin edit cannot reset them.
CREATE TABLE "CompanyHub" (
  "companyId" integer PRIMARY KEY REFERENCES "Company" ("id") ON DELETE CASCADE,
  "pinId"     integer NOT NULL UNIQUE REFERENCES "Pin" ("id") ON DELETE CASCADE
);

CREATE TABLE "CompanyProduct" (
  "id"          serial PRIMARY KEY,
  "companyId"   integer NOT NULL REFERENCES "Company" ("id") ON DELETE CASCADE,
  "parentId"    integer REFERENCES "CompanyProduct" ("id") ON DELETE CASCADE,
  "name"        varchar(200) NOT NULL,
  "summary"     varchar(400),
  "rank"        smallint NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "UX_CompanyProduct_name" ON "CompanyProduct" ("companyId", COALESCE("parentId", 0), lower("name"));
CREATE INDEX "IX_CompanyProduct_company" ON "CompanyProduct" ("companyId");

CREATE TABLE "CompanyProductPin" (
  "productId" integer NOT NULL REFERENCES "CompanyProduct" ("id") ON DELETE CASCADE,
  "pinId"     integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  PRIMARY KEY ("productId", "pinId")
);
CREATE INDEX "IX_CompanyProductPin_pinId" ON "CompanyProductPin" ("pinId");
