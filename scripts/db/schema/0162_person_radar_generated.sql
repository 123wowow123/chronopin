-- Every person's radar is backed by the wiki (0151): when it is compiled, an
-- "Overview" phase is generated from what is documented about them - the
-- office held, income against the IRS percentiles, the highest degree, the
-- reviewed legal record - and stored with the hand-researched phases. The
-- generated rows are rebuilt with the wiki; the hand ones are only changed by
-- the update API (PUT /api/people/:id/wiki).
ALTER TABLE "PersonPhase"
  ADD COLUMN "origin" varchar(10) NOT NULL DEFAULT 'hand' CONSTRAINT "CK_PersonPhase_origin" CHECK ("origin" IN ('hand', 'generated'));

-- The highest degree a person holds, read from Wikidata's "academic degree"
-- (P512), on the rubric's scale: 2 associate, 3 bachelor's, 4 master's or a
-- professional degree (J.D., M.D.), 5 a research doctorate. NULL where
-- nothing is recorded: the axis is then a gap, not a guess.
ALTER TABLE "Person"
  ADD COLUMN "educationLevel"     numeric(2, 1) CONSTRAINT "CK_Person_educationLevel" CHECK ("educationLevel" BETWEEN 1 AND 5),
  ADD COLUMN "educationNote"      text,
  ADD COLUMN "educationSourceUrl" text;
