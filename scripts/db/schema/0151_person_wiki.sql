-- The wiki under a person's page. What the page shows is not read from the
-- fact tables directly: every save compiles them (src/lib/personWiki.ts)
-- into an Open Knowledge Format (v0.2) concept - a `Person` page whose
-- statements cite numbered sources - and the page renders that compiled
-- record, references and all. The same pattern as UserWiki (0028).
--
-- A cited link is a Source row (0026) like the links pins cite, so the link
-- wiki pipeline (`npm run people:wiki -- --sources`, or wiki:sync's
-- machinery) can read and write up each reference once, and the rows are
-- shared with any pin citing the same article. A person cites it under a
-- number, `ref`, which is its footnote on the page and in the wiki.

CREATE TABLE "PersonSource" (
  "personId"     integer NOT NULL REFERENCES "Person" ("id") ON DELETE CASCADE,
  "sourceId"         integer NOT NULL REFERENCES "Source" ("id") ON DELETE CASCADE,
  -- The footnote number, 1.. in the order the page first cites it.
  "ref"              smallint NOT NULL CONSTRAINT "CK_PersonSource_ref" CHECK ("ref" > 0),
  -- When this person first cited it, shown as the day it was recorded.
  "utcAddedDateTime" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("personId", "sourceId"),
  CONSTRAINT "UC_PersonSource_ref" UNIQUE ("personId", "ref")
);
CREATE INDEX "IX_PersonSource_sourceId" ON "PersonSource" ("sourceId");

CREATE TABLE "PersonWiki" (
  "personId"     integer PRIMARY KEY REFERENCES "Person" ("id") ON DELETE CASCADE,
  -- The compiled profile the page renders: the facts, the numbered sources and
  -- which source each fact cites (src/lib/personWiki.ts CompiledPerson).
  "profile"          jsonb NOT NULL,
  -- The same as an OKF concept (type: Person), written by chronopin-person-wiki/1.
  "page"             text NOT NULL,
  "wikiVersion"      smallint NOT NULL DEFAULT 1,
  "utcBuiltDateTime" timestamptz NOT NULL DEFAULT now()
);
