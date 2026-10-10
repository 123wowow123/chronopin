-- PinConfidence: every pin's confidence score, stored and kept current.
--
-- "pinConfidence" (0009) weighs a pin's references, so every filter on it
-- aggregated PinReference per row. A page of "the newest 12" could not stop
-- early: the planner scored all ~6.7k live pins to find 12 that clear the
-- timeline's bar, ~22k buffers a call. In production those calls (new pins,
-- trending, the map, tag counts) were 1-2 s each and held both vCPUs.
--
-- The score depends only on the pin's own row and its references (never on
-- the clock: items weigh by their age relative to the newest item), so it can
-- be stored. Readers use "pinConfidenceOf" (src/server/model/pins.ts), which
-- now reads this table. It is a table of its own rather than a column on
-- "Pin" so that refreshing it does not fire the pin cache triggers
-- (PinBaseCache, PinTagCache), which fire on any Pin update.
--
-- If "pinConfidence" (0009) or its mirror in src/lib/referenceConfidence.ts
-- changes, end the migration with SELECT "pinConfidenceRebuild"();

CREATE TABLE "PinConfidence" (
  "pinId" integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "score" integer
);

-- The same references json "pinConfidenceOf" used to build per row.
CREATE FUNCTION "pinConfidenceScore"("pid" integer) RETURNS integer
LANGUAGE sql STABLE AS $$
  SELECT "pinConfidence"(
    (SELECT COALESCE(json_agg(json_build_object(
              'url', "r"."url",
              'confidence', "r"."confidence",
              'publishedDate', to_char("r"."publishedDate", 'YYYY-MM-DD'),
              'utcCreatedDateTime', "r"."utcCreatedDateTime"
            ) ORDER BY "r"."id"), '[]'::json)
     FROM "PinReference" AS "r"
     WHERE "r"."pinId" = "p"."id"),
    "p"."sourceUrl", "p"."dateConfidence", "p"."utcCreatedDateTime")
  FROM "Pin" AS "p"
  WHERE "p"."id" = "pid"
$$;

-- Writes only when the score changed, so an edit that leaves it alone is free.
CREATE FUNCTION "pinConfidenceRefresh"("pid" integer) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF "pid" IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO "PinConfidence" ("pinId", "score")
  SELECT "p"."id", "pinConfidenceScore"("p"."id")
  FROM "Pin" AS "p"
  WHERE "p"."id" = "pid"
  ON CONFLICT ("pinId") DO UPDATE SET "score" = EXCLUDED."score"
  WHERE "PinConfidence"."score" IS DISTINCT FROM EXCLUDED."score";
END $$;

CREATE FUNCTION "pinConfidenceRebuild"() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  TRUNCATE "PinConfidence";
  INSERT INTO "PinConfidence" ("pinId", "score")
  SELECT "id", "pinConfidenceScore"("id") FROM "Pin";
  ANALYZE "PinConfidence";
END $$;

-- A pin's own fields: its source and date confidence feed the score, and its
-- creation time is the source's date.
CREATE FUNCTION "pinConfidencePin"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "pinConfidenceRefresh"(NEW."id");
  RETURN NULL;
END $$;

CREATE TRIGGER "Pin_pinConfidence_ins"
  AFTER INSERT ON "Pin"
  FOR EACH ROW EXECUTE FUNCTION "pinConfidencePin"();

CREATE TRIGGER "Pin_pinConfidence_upd"
  AFTER UPDATE OF "sourceUrl", "dateConfidence", "utcCreatedDateTime" ON "Pin"
  FOR EACH ROW
  WHEN (OLD."sourceUrl" IS DISTINCT FROM NEW."sourceUrl"
     OR OLD."dateConfidence" IS DISTINCT FROM NEW."dateConfidence"
     OR OLD."utcCreatedDateTime" IS DISTINCT FROM NEW."utcCreatedDateTime")
  EXECUTE FUNCTION "pinConfidencePin"();

-- A reference added, re-scored, re-pointed or removed.
CREATE FUNCTION "pinConfidenceReference"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM "pinConfidenceRefresh"(OLD."pinId");
  END IF;
  IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW."pinId" IS DISTINCT FROM OLD."pinId") THEN
    PERFORM "pinConfidenceRefresh"(NEW."pinId");
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER "PinReference_pinConfidence"
  AFTER INSERT OR UPDATE OR DELETE ON "PinReference"
  FOR EACH ROW EXECUTE FUNCTION "pinConfidenceReference"();

SELECT "pinConfidenceRebuild"();

-- "The newest N live pins" walks this and stops once a page is full.
CREATE INDEX "IX_Pin_live_utcCreatedDateTime" ON "Pin" ("utcCreatedDateTime" DESC, "id" DESC)
  WHERE "utcDeletedDateTime" IS NULL;
ANALYZE "Pin";
