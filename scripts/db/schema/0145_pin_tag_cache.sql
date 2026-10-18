-- PinTagCache: the tags every pin carries, materialized and kept current.
--
-- PinTagView (0056 and its successors) is a DISTINCT ON over every PinTag row
-- unioned with derived award and thread tags, each with a correlated subquery.
-- Counting a search's tags for the cloud reads all of it, and a cache miss took
-- 20+ seconds in production (40k tags, 6.7k pins) while holding the B2s's CPU.
--
-- The definition moves to "PinTagBaseView"; "PinTagView" becomes a plain view
-- over the table, so every reader keeps its name. Statement triggers re-copy
-- the pins a write touched, as PinBaseCache (0072) does.
--
-- A migration that changes "PinTagBaseView" must end with
-- SELECT "pinTagCacheRebuild"();

ALTER VIEW "PinTagView" RENAME TO "PinTagBaseView";

CREATE TABLE "PinTagCache" AS SELECT * FROM "PinTagBaseView";
CREATE UNIQUE INDEX "UX_PinTagCache_pinId_name" ON "PinTagCache" ("pinId", "name");
CREATE INDEX "IX_PinTagCache_name" ON "PinTagCache" ("name");
ANALYZE "PinTagCache";

CREATE VIEW "PinTagView" AS SELECT "pinId", "name", "kind", "source" FROM "PinTagCache";

CREATE FUNCTION "pinTagCacheRebuild"() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  TRUNCATE "PinTagCache";
  INSERT INTO "PinTagCache" SELECT * FROM "PinTagBaseView";
  ANALYZE "PinTagCache";
END $$;

-- A pin's thread tag follows its parent and children, so those are refreshed
-- with it. Locks in id order keep two writers from doubling a pin's rows.
CREATE FUNCTION "pinTagCacheRefresh"(ids integer[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  pins integer[];
  pin integer;
BEGIN
  ids := ARRAY(SELECT DISTINCT i FROM unnest(ids) AS i WHERE i IS NOT NULL);
  IF cardinality(ids) = 0 THEN
    RETURN;
  END IF;
  pins := ARRAY(
    SELECT DISTINCT m FROM (
      SELECT unnest(ids) AS m
      UNION ALL
      SELECT "parentId" FROM "Pin" WHERE "id" = ANY(ids)
      UNION ALL
      SELECT "id" FROM "Pin" WHERE "parentId" = ANY(ids)
    ) AS s
    WHERE m IS NOT NULL
    ORDER BY m);
  FOREACH pin IN ARRAY pins LOOP
    PERFORM pg_advisory_xact_lock(hashtext('PinTagCache'), pin);
  END LOOP;
  DELETE FROM "PinTagCache" WHERE "pinId" = ANY(pins);
  INSERT INTO "PinTagCache" SELECT * FROM "PinTagBaseView" WHERE "pinId" = ANY(pins);
END $$;

CREATE FUNCTION "pinTagCacheTouch"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  col text;
  ids integer[] := '{}';
  part integer[];
BEGIN
  FOREACH col IN ARRAY TG_ARGV LOOP
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      EXECUTE format('SELECT array_agg(%I) FROM new_rows', col) INTO part;
      ids := ids || COALESCE(part, '{}');
    END IF;
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
      EXECUTE format('SELECT array_agg(%I) FROM old_rows', col) INTO part;
      ids := ids || COALESCE(part, '{}');
    END IF;
  END LOOP;
  PERFORM "pinTagCacheRefresh"(ids);
  RETURN NULL;
END $$;

-- Named "0..." so they fire before the PinBaseCache triggers (AFTER triggers
-- run by name), which read PinTagView when they re-copy a pin.
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('PinTag', '''pinId'''),
      ('PinAward', '''pinId'''),
      ('Pin', '''id'', ''parentId''')
    ) AS t ("tbl", "args")
  LOOP
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT ON %I REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "pinTagCacheTouch"(%s)',
      '0pinTagCache_' || spec.tbl || '_ins', spec.tbl, spec.args);
    EXECUTE format('CREATE TRIGGER %I AFTER UPDATE ON %I REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "pinTagCacheTouch"(%s)',
      '0pinTagCache_' || spec.tbl || '_upd', spec.tbl, spec.args);
    EXECUTE format('CREATE TRIGGER %I AFTER DELETE ON %I REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION "pinTagCacheTouch"(%s)',
      '0pinTagCache_' || spec.tbl || '_del', spec.tbl, spec.args);
  END LOOP;
END $$;
