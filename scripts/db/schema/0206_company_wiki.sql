-- The wiki behind a company: its sourced facts (what it is, ticker, headquarters, parent, sector and the
-- source of that sector, leadership, and the disclosed congressional trades in it) compiled by
-- src/lib/companyWiki.ts into an Open Knowledge Format (v0.2) `Organization` concept whose statements cite
-- numbered sources. Rebuilt by `npm run companies:wiki`; served at GET /api/companies/:id/wiki.
CREATE TABLE "CompanyWiki" (
  "companyId"        integer PRIMARY KEY REFERENCES "Company" ("id") ON DELETE CASCADE,
  "page"             text NOT NULL,
  -- [{ref, url, title}] in footnote order.
  "sources"          jsonb NOT NULL DEFAULT '[]',
  "wikiVersion"      smallint NOT NULL DEFAULT 1,
  "utcBuiltDateTime" timestamptz NOT NULL DEFAULT now()
);
