-- PinBaseCache: PinBaseView (0059) materialized, and kept current row by row.
--
-- Building the view costs 1-2ms a pin: every row runs its references,
-- ratings, stocks, awards, tags, flight path, place, view count and duplicate
-- group subqueries, then groups. A timeline page reads two pages of them, and
-- the whole view took 5s in production (5452 rows, 2744 pins). A plain
-- MATERIALIZED VIEW would need that 5s REFRESH after every write - view
-- counts and likes included - so this is the incremental kind instead: a
-- table with the view's exact columns and rows, and statement triggers on
-- every table the view reads that re-copy just the pins a statement touched.
--
-- The view stays the definition; the app reads the table. Same columns, same
-- one row per pin x medium x merchant, so a query only swaps the name.
--
-- A migration that changes PinBaseView must end with
-- SELECT "pinBaseCacheRebuild"(); to give the table the new shape - migrate.ts
-- runs it by itself after any file that mentions the view.

CREATE FUNCTION "pinBaseCacheRebuild"() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DROP TABLE IF EXISTS "PinBaseCache";
  CREATE TABLE "PinBaseCache" AS SELECT * FROM "PinBaseView";
  CREATE INDEX "IX_PinBaseCache_id" ON "PinBaseCache" ("id");
  ANALYZE "PinBaseCache";
END $$;

SELECT "pinBaseCacheRebuild"();

-- Re-copies the given pins from the view (deleting those it no longer has).
-- A duplicate group spans pins, so the members of the pins' groups - as the
-- cache has them and as they are now - are refreshed with them. The advisory
-- locks, taken in id order, make two transactions refreshing the same pin
-- (two views of it at once) take turns: interleaved, each would delete only
-- the rows it could see and both inserts would stay, doubling the pin.
CREATE FUNCTION "pinBaseCacheRefresh"(ids integer[]) RETURNS void LANGUAGE plpgsql AS $$
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
      SELECT unnest("duplicateGroup") FROM "PinBaseCache" WHERE "id" = ANY(ids)
      UNION ALL
      SELECT unnest("pinDuplicateGroup"(i)) FROM unnest(ids) AS i
    ) AS s
    WHERE m IS NOT NULL
    ORDER BY m);
  FOREACH pin IN ARRAY pins LOOP
    PERFORM pg_advisory_xact_lock(hashtext('PinBaseCache'), pin);
  END LOOP;
  DELETE FROM "PinBaseCache" WHERE "id" = ANY(pins);
  INSERT INTO "PinBaseCache" SELECT * FROM "PinBaseView" WHERE "id" = ANY(pins);
END $$;

-- For a table whose rows name their pin: the arguments are the columns that
-- do ("pinId"; "id" and "parentId" on Pin, whose parent's thread flag and tag
-- follow its children; "pinId" and "otherPinId" on PinDuplicate), read from
-- the rows the statement wrote and the rows it replaced or removed.
CREATE FUNCTION "pinBaseCacheTouch"() RETURNS trigger LANGUAGE plpgsql AS $$
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
  PERFORM "pinBaseCacheRefresh"(ids);
  RETURN NULL;
END $$;

-- For a table that reaches pins through another: TG_ARGV[0] is the key column
-- of the rows written, TG_ARGV[1] a query turning those keys ($1) into pin ids.
CREATE FUNCTION "pinBaseCacheTouchVia"() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  keys integer[] := '{}';
  part integer[];
  ids integer[];
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    EXECUTE format('SELECT array_agg(%I) FROM new_rows', TG_ARGV[0]) INTO part;
    keys := keys || COALESCE(part, '{}');
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    EXECUTE format('SELECT array_agg(%I) FROM old_rows', TG_ARGV[0]) INTO part;
    keys := keys || COALESCE(part, '{}');
  END IF;
  EXECUTE TG_ARGV[1] INTO ids USING keys;
  PERFORM "pinBaseCacheRefresh"(ids);
  RETURN NULL;
END $$;

-- A company's pins show its name, wiki link and logo. Its other columns
-- (sentiment, HQ, stock facts) change far more often and show on no pin.
CREATE FUNCTION "pinBaseCacheTouchCompany"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "pinBaseCacheRefresh"(ARRAY(
    SELECT "p"."id"
    FROM new_rows AS "n"
      JOIN old_rows AS "o" ON "o"."id" = "n"."id"
      JOIN "Pin" AS "p" ON "p"."companyId" = "n"."id"
    WHERE ("n"."name", "n"."wikiUrl", "n"."logoUrl") IS DISTINCT FROM ("o"."name", "o"."wikiUrl", "o"."logoUrl")));
  RETURN NULL;
END $$;

-- A user's pins and the references they added show their handle and picture.
-- Nothing else about an account does, and accounts are saved often
-- (preferences, the device's location), some with hundreds of pins.
CREATE FUNCTION "pinBaseCacheTouchUser"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "pinBaseCacheRefresh"(ARRAY(
    WITH "changed" AS (
      SELECT "n"."id"
      FROM new_rows AS "n" JOIN old_rows AS "o" ON "o"."id" = "n"."id"
      WHERE ("n"."userName", "n"."pictureUrl") IS DISTINCT FROM ("o"."userName", "o"."pictureUrl")
    )
    SELECT "p"."id" FROM "Pin" AS "p" WHERE "p"."userId" IN (SELECT "id" FROM "changed")
    UNION
    SELECT "r"."pinId" FROM "PinReference" AS "r" WHERE "r"."addedByUserId" IN (SELECT "id" FROM "changed")));
  RETURN NULL;
END $$;

-- Statement triggers (one per event: transition tables allow no more), so a
-- write of many rows refreshes each of its pins once.
DO $$
DECLARE
  spec record;
BEGIN
  FOR spec IN
    SELECT * FROM (VALUES
      ('Pin', 'pinBaseCacheTouch', '''id'', ''parentId'''),
      ('PinMedium', 'pinBaseCacheTouch', '''pinId'''),
      ('Merchant', 'pinBaseCacheTouch', '''pinId'''),
      ('Favorite', 'pinBaseCacheTouch', '''pinId'''),
      ('Like', 'pinBaseCacheTouch', '''pinId'''),
      ('PinReference', 'pinBaseCacheTouch', '''pinId'''),
      ('PinRating', 'pinBaseCacheTouch', '''pinId'''),
      ('PinTicker', 'pinBaseCacheTouch', '''pinId'''),
      ('PinAward', 'pinBaseCacheTouch', '''pinId'''),
      ('PinTag', 'pinBaseCacheTouch', '''pinId'''),
      ('PinFlightPath', 'pinBaseCacheTouch', '''pinId'''),
      ('PinPlace', 'pinBaseCacheTouch', '''pinId'''),
      ('PinView', 'pinBaseCacheTouch', '''pinId'''),
      ('PinDuplicate', 'pinBaseCacheTouch', '''pinId'', ''otherPinId'''),
      ('PinTickerPrice', 'pinBaseCacheTouchVia',
        '''pinTickerId'', ''SELECT array_agg("pinId") FROM "PinTicker" WHERE "id" = ANY($1)'''),
      ('Medium', 'pinBaseCacheTouchVia',
        '''id'', ''SELECT array_agg("pinId") FROM "PinMedium" WHERE "mediumId" = ANY($1)''')
    ) AS t ("tbl", "fn", "args")
  LOOP
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT ON %I REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION %I(%s)',
      spec.tbl || '_pinBaseCache_ins', spec.tbl, spec.fn, spec.args);
    EXECUTE format('CREATE TRIGGER %I AFTER UPDATE ON %I REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION %I(%s)',
      spec.tbl || '_pinBaseCache_upd', spec.tbl, spec.fn, spec.args);
    EXECUTE format('CREATE TRIGGER %I AFTER DELETE ON %I REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION %I(%s)',
      spec.tbl || '_pinBaseCache_del', spec.tbl, spec.fn, spec.args);
  END LOOP;
END $$;

-- Only an update of a company or an account can change what its pins show:
-- a new one has no pins yet, and a deleted one's pins change themselves
-- (companyId set null, or the pins removed with the account).
CREATE TRIGGER "Company_pinBaseCache_upd" AFTER UPDATE ON "Company"
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION "pinBaseCacheTouchCompany"();
CREATE TRIGGER "User_pinBaseCache_upd" AFTER UPDATE ON "User"
  REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
  FOR EACH STATEMENT EXECUTE FUNCTION "pinBaseCacheTouchUser"();
