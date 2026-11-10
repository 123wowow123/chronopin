-- "Problem it solves": why a project exists, shown as a widget on the pin page for pins
-- about something built or proposed (construction, energy, housing, transit, dams, ...).
--
--   problem    the problem or need the project addresses, in one or two plain sentences.
--   solution   how the project answers it (optional).
--   beneficiaries  who it is for (optional), e.g. "commuters on the Eastside".
--   sourceUrl  the page that states the rationale.
--
-- One row per pin. Pin#update() never touches it.
CREATE TABLE "PinPurpose" (
  "pinId"         integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "problem"       varchar(600) NOT NULL,
  "solution"      varchar(600),
  "beneficiaries" varchar(300),
  "sourceUrl"     varchar(4000),
  "checkedAt"     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinPurpose_problem" CHECK (length(btrim("problem")) > 0)
);
