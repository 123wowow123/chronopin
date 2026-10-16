-- Campaign finance for members of Congress and the races they ran, from the
-- FEC's bulk files (weball: every candidate's summary per two-year cycle;
-- pas2: committee-to-candidate contributions; cm: committee names). One row
-- per person and cycle, the other candidates in the same race ("opponents",
-- primary and general alike) and the PACs that gave most. Amounts are the
-- FEC's own figures through the coverage date; nothing is estimated.
CREATE TABLE "PersonCampaign" (
  "personId"       integer NOT NULL REFERENCES "Person" ("id") ON DELETE CASCADE,
  "cycle"          smallint NOT NULL,
  "fecCandidateId" varchar(9) NOT NULL,
  -- 'H' house, 'S' senate; district is NULL for the Senate.
  "office"         char(1) NOT NULL,
  "state"          char(2) NOT NULL,
  "district"       varchar(2),
  -- I incumbent, C challenger, O open seat.
  "status"         char(1),
  "party"          varchar(8),
  "receipts"       numeric(14,2),
  "disbursements"  numeric(14,2),
  "cashOnHand"     numeric(14,2),
  "individual"     numeric(14,2),
  "pac"            numeric(14,2),
  "partyCommittee" numeric(14,2),
  "selfFunded"     numeric(14,2),
  "debts"          numeric(14,2),
  "coverageEnd"    date,
  -- Share of the general-election vote, where the FEC has the result.
  "votePct"        numeric(5,2),
  "sourceUrl"      text NOT NULL,
  PRIMARY KEY ("personId", "cycle")
);

CREATE TABLE "PersonCampaignRival" (
  "personId"       integer NOT NULL,
  "cycle"          smallint NOT NULL,
  "fecCandidateId" varchar(9) NOT NULL,
  "name"           varchar(120) NOT NULL,
  "party"          varchar(8),
  "status"         char(1),
  "receipts"       numeric(14,2),
  "disbursements"  numeric(14,2),
  "cashOnHand"     numeric(14,2),
  "votePct"        numeric(5,2),
  -- Whether the candidate was on the general-election ballot.
  "general"        boolean NOT NULL DEFAULT false,
  "sourceUrl"      text NOT NULL,
  PRIMARY KEY ("personId", "cycle", "fecCandidateId"),
  FOREIGN KEY ("personId", "cycle") REFERENCES "PersonCampaign" ("personId", "cycle") ON DELETE CASCADE
);

CREATE TABLE "PersonCampaignPac" (
  "personId"    integer NOT NULL,
  "cycle"       smallint NOT NULL,
  "committeeId" varchar(9) NOT NULL,
  "name"        varchar(200) NOT NULL,
  "amount"      numeric(14,2) NOT NULL,
  "count"       integer NOT NULL,
  "sourceUrl"   text NOT NULL,
  PRIMARY KEY ("personId", "cycle", "committeeId"),
  FOREIGN KEY ("personId", "cycle") REFERENCES "PersonCampaign" ("personId", "cycle") ON DELETE CASCADE
);
