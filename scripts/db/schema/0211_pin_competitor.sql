-- The main competing products a product pin lists: the C919's pin names the
-- Airbus A320neo and the Boeing 737 MAX 8, each linked to its own pin when
-- there is one.
--
--   rank             1 = the closest rival; unique per pin.
--   name             the competing product as its maker names it.
--   maker            who makes it (NULL when the name already says).
--   competitorPinId  the pin for that product. SET NULL if it goes.
--   summary          the figures worth comparing, one line (seats, range ...).
--   sourceUrl        where the comparison was read.
--
-- Looked-up data like PinCandidate: Pin#update() never touches it, and it is
-- not in PinBaseView - only the pin page reads it.
CREATE TABLE "PinCompetitor" (
  "id"              serial PRIMARY KEY,
  "pinId"           integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "rank"            smallint NOT NULL,
  "name"            varchar(200) NOT NULL,
  "maker"           varchar(200),
  "competitorPinId" integer REFERENCES "Pin" ("id") ON DELETE SET NULL,
  "summary"         varchar(400),
  "sourceUrl"       varchar(4000),
  CONSTRAINT "CK_PinCompetitor_rank" CHECK ("rank" >= 1),
  CONSTRAINT "UX_PinCompetitor_rank" UNIQUE ("pinId", "rank")
);
CREATE INDEX "IX_PinCompetitor_competitorPinId" ON "PinCompetitor" ("competitorPinId");
