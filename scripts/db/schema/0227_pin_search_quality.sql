-- PinSearchQuality: each pin's summary text length and cited-page count, stored.
--
-- The thin-pin rule (THIN_PIN_SQL, src/server/model/searchIssues.ts) read both
-- off "Pin" for every row it tested: two regexp_replace passes over the
-- summaries and a PinReference count subquery. The sitemap tests every live
-- pin (~13k) on each rebuild, ~1.2 s locally and far more on the 2-vCPU
-- production box, where a cold sitemap.xml outlasted the proxy and answered
-- 502 to Search Console.
--
-- Readers use textLengthSql / sourceCountSql, which now read this table. It
-- is a table of its own, as "PinConfidence" (0147) is, so refreshing it does
-- not fire the pin cache triggers. If the rule in textLengthSql or
-- sourceCountSql changes, end the migration with SELECT "pinSearchQualityRebuild"();

CREATE TABLE "PinSearchQuality" (
  "pinId" integer PRIMARY KEY REFERENCES "Pin" ("id") ON DELETE CASCADE,
  "textLength" integer NOT NULL,
  "sourceCount" integer NOT NULL
);

-- Writes only when a figure changed, so an edit that leaves both alone is free.
CREATE FUNCTION "pinSearchQualityRefresh"("pid" integer) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  IF "pid" IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO "PinSearchQuality" ("pinId", "textLength", "sourceCount")
  SELECT "p"."id",
    length(regexp_replace(coalesce("p"."description", ''), '<[^>]+>', '', 'g'))
      + length(regexp_replace(coalesce("p"."longFormSummary", ''), '<[^>]+>', '', 'g')),
    (CASE WHEN coalesce(trim("p"."sourceUrl"), '') <> '' THEN 1 ELSE 0 END)
      + (SELECT count(*) FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id" AND "r"."url" IS DISTINCT FROM trim("p"."sourceUrl"))
  FROM "Pin" AS "p"
  WHERE "p"."id" = "pid"
  ON CONFLICT ("pinId") DO UPDATE
    SET "textLength" = EXCLUDED."textLength", "sourceCount" = EXCLUDED."sourceCount"
    WHERE ("PinSearchQuality"."textLength", "PinSearchQuality"."sourceCount")
      IS DISTINCT FROM (EXCLUDED."textLength", EXCLUDED."sourceCount");
END $$;

CREATE FUNCTION "pinSearchQualityRebuild"() RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  TRUNCATE "PinSearchQuality";
  INSERT INTO "PinSearchQuality" ("pinId", "textLength", "sourceCount")
  SELECT "p"."id",
    length(regexp_replace(coalesce("p"."description", ''), '<[^>]+>', '', 'g'))
      + length(regexp_replace(coalesce("p"."longFormSummary", ''), '<[^>]+>', '', 'g')),
    (CASE WHEN coalesce(trim("p"."sourceUrl"), '') <> '' THEN 1 ELSE 0 END)
      + (SELECT count(*) FROM "PinReference" AS "r" WHERE "r"."pinId" = "p"."id" AND "r"."url" IS DISTINCT FROM trim("p"."sourceUrl"))
  FROM "Pin" AS "p";
  ANALYZE "PinSearchQuality";
END $$;

CREATE FUNCTION "pinSearchQualityPin"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  PERFORM "pinSearchQualityRefresh"(NEW."id");
  RETURN NULL;
END $$;

CREATE TRIGGER "Pin_pinSearchQuality_ins"
  AFTER INSERT ON "Pin"
  FOR EACH ROW EXECUTE FUNCTION "pinSearchQualityPin"();

CREATE TRIGGER "Pin_pinSearchQuality_upd"
  AFTER UPDATE OF "description", "longFormSummary", "sourceUrl" ON "Pin"
  FOR EACH ROW
  WHEN (OLD."description" IS DISTINCT FROM NEW."description"
     OR OLD."longFormSummary" IS DISTINCT FROM NEW."longFormSummary"
     OR OLD."sourceUrl" IS DISTINCT FROM NEW."sourceUrl")
  EXECUTE FUNCTION "pinSearchQualityPin"();

-- A reference added, re-pointed or removed.
CREATE FUNCTION "pinSearchQualityReference"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP <> 'INSERT' THEN
    PERFORM "pinSearchQualityRefresh"(OLD."pinId");
  END IF;
  IF TG_OP <> 'DELETE' AND (TG_OP = 'INSERT' OR NEW."pinId" IS DISTINCT FROM OLD."pinId" OR NEW."url" IS DISTINCT FROM OLD."url") THEN
    PERFORM "pinSearchQualityRefresh"(NEW."pinId");
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER "PinReference_pinSearchQuality"
  AFTER INSERT OR UPDATE OR DELETE ON "PinReference"
  FOR EACH ROW EXECUTE FUNCTION "pinSearchQualityReference"();

SELECT "pinSearchQualityRebuild"();
