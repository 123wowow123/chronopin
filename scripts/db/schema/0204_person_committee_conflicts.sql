-- Congressional committee seats and the sector of each traded ticker, so a stock
-- trade can be marked as a possible conflict of interest.
--
-- PersonCommittee: one row per committee or subcommittee seat a sitting member holds
-- (congress-legislators committee-membership-current). committeeId is the Thomas id
-- (HSAS, HSAS03); parentId is the full committee of a subcommittee. sectors lists the
-- industries the committee oversees (src/lib/conflicts.ts), copied onto every row so
-- the conflict test is one join.
CREATE TABLE "PersonCommittee" (
  "personId"    integer NOT NULL REFERENCES "Person" ("id") ON DELETE CASCADE,
  "committeeId" varchar(12) NOT NULL,
  "parentId"    varchar(12),
  "name"        varchar(200) NOT NULL,
  "chamber"     varchar(10) NOT NULL CHECK ("chamber" IN ('house', 'senate', 'joint')),
  "title"       varchar(60),
  "rank"        smallint,
  "sectors"     text[] NOT NULL DEFAULT '{}',
  "sourceUrl"   varchar(400) NOT NULL,
  "checkedAt"   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("personId", "committeeId")
);
CREATE INDEX "IX_PersonCommittee_sectors" ON "PersonCommittee" USING gin ("sectors");

-- TickerSector: the sector a ticker trades in, from the SEC's SIC code for its filer.
CREATE TABLE "TickerSector" (
  "ticker"    varchar(20) PRIMARY KEY,
  "cik"       integer,
  "sic"       integer,
  "sicLabel"  varchar(200),
  "sector"    varchar(30),
  "checkedAt" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "IX_TickerSector_sector" ON "TickerSector" ("sector");
