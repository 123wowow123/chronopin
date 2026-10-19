-- The electrical capacity a pin's facility is built for or draws, in megawatts:
-- a data centre's critical IT load or campus power, a solar farm's or battery's
-- nameplate. The pin page shows it and the map totals it.
--
--   megawatts  capacity in MW (1 GW = 1000). A range is stored as its
--              headline (upper) figure with the range in note.
--   source     'title' (read off the pin's own title), 'hand' (a person or a
--              session, from sourceUrl; never overwritten by 'title').
--   sourceUrl  the page that states it.
--   note       the claim in words ("planned phase 1 of 4", "up to 1 GW").
--
-- One row per pin. Like PinEventInfo, Pin#update() never touches it, so
-- editing a pin cannot wipe it, and it is not in PinBaseView.
CREATE TABLE "PinPower" (
  "pinId"      integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "megawatts"  numeric(12, 2) NOT NULL,
  "source"     varchar(8) NOT NULL DEFAULT 'hand',
  "sourceUrl"  varchar(4000),
  "note"       varchar(500),
  "checkedAt"  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "CK_PinPower_megawatts" CHECK ("megawatts" > 0),
  CONSTRAINT "CK_PinPower_source" CHECK ("source" IN ('title', 'hand'))
);

-- Backfill from titles that state a capacity ("500 MW", "1.5 GW").
INSERT INTO "PinPower" ("pinId", "megawatts", "source", "sourceUrl")
SELECT "id", "mw", 'title', "sourceUrl"
FROM (
  SELECT "p"."id", "p"."sourceUrl",
    (replace("m"[1], ',', '')::numeric * CASE WHEN upper("m"[2]) = 'GW' THEN 1000 ELSE 1 END) AS "mw"
  FROM "Pin" AS "p"
  CROSS JOIN LATERAL (SELECT regexp_match("p"."title", '(\d[\d,]*(?:\.\d+)?)\s?(MW|GW)\y', 'i') AS "m") AS "x"
  WHERE "p"."utcDeletedDateTime" IS NULL AND "x"."m" IS NOT NULL
) AS "found"
WHERE "mw" > 0 AND "mw" < 10000000
ON CONFLICT DO NOTHING;
