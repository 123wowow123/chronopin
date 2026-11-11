-- "Pro tips": short, practical, sourced advice shown as a panel on the pin page when a pin has any
-- (how to get the best seat, when to arrive, what to skip, a setting to change, ...).
--
--   tip        the advice, one or two plain sentences.
--   sourceUrl  the page that gives the advice (optional).
--   position   display order, lowest first.
--
-- Many rows per pin. Pin#update() never touches it.
CREATE TABLE "PinProTip" (
  "id"        serial PRIMARY KEY,
  "pinId"     integer NOT NULL REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "tip"       varchar(500) NOT NULL,
  "sourceUrl" varchar(4000),
  "position"  smallint NOT NULL DEFAULT 0,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinProTip_tip" CHECK (length(btrim("tip")) > 0)
);
CREATE INDEX "IX_PinProTip_pinId" ON "PinProTip" ("pinId", "position");
