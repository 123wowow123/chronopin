-- OKF v0.2 wikis for the two things a conflict-of-interest mark rests on: a congressional committee
-- (kind 'committee', key = Thomas id, e.g. HSAS or HSAS03) and a trade filing (kind 'filing',
-- key = "<chamber>:<filingId>"). Compiled by src/lib/govWiki.ts from PersonCommittee / PersonTrade;
-- `npm run gov:wiki` rebuilds them. Served at /api/committees/:id/wiki and /api/trade-filings/:chamber/:filingId/wiki.
CREATE TABLE "GovWiki" (
  "kind"             varchar(12) NOT NULL CHECK ("kind" IN ('committee', 'filing')),
  "key"              varchar(60) NOT NULL,
  "title"            varchar(300) NOT NULL,
  "page"             text NOT NULL,
  "sources"          jsonb NOT NULL DEFAULT '[]',
  "wikiVersion"      smallint NOT NULL DEFAULT 1,
  "utcBuiltDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("kind", "key")
);
