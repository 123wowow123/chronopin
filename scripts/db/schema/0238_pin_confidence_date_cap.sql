-- A pin's confidence is capped by its date confidence.
--
-- The score averaged the references' confidence, so a pin whose date was only
-- an estimate ("commercial operation anticipated for November 2026", placed on
-- the 1st) still scored 75-80% from well-rated references and filled the day
-- on the timeline. Now an estimated date caps the score at 65, a delayed one
-- at 55 and an unknown one at 40, under TIMELINE_MIN_CONFIDENCE (70). Mirrors
-- DATE_CONFIDENCE_CAP in src/lib/referenceConfidence.ts. Predicted pins are
-- exempt from the timeline bar in the queries (predictedPinOf), not here.

CREATE OR REPLACE FUNCTION "pinConfidence"(
  "references"         json,
  "sourceUrl"          text,
  "dateConfidence"     text,
  "utcCreatedDateTime" timestamptz
) RETURNS integer
LANGUAGE sql STABLE AS $$
  WITH "evidence" AS (
    SELECT
      ("r" ->> 'confidence')::numeric AS "confidence",
      COALESCE(("r" ->> 'publishedDate')::date::timestamp AT TIME ZONE 'UTC',
               ("r" ->> 'utcCreatedDateTime')::timestamptz) AS "at"
    FROM json_array_elements(COALESCE("references", '[]'::json)) AS "r"
    UNION ALL
    SELECT
      CASE lower("dateConfidence")
        WHEN 'confirmed' THEN 90
        WHEN 'scheduled' THEN 75
        WHEN 'estimated' THEN 50
        WHEN 'delayed'   THEN 40
        WHEN 'unknown'   THEN 25
      END,
      "utcCreatedDateTime"
    WHERE NULLIF(btrim("sourceUrl"), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM json_array_elements(COALESCE("references", '[]'::json)) AS "r"
        WHERE "r" ->> 'url' = btrim("sourceUrl"))
  ),
  "scored" AS (
    SELECT "confidence", "at" FROM "evidence" WHERE "confidence" IS NOT NULL
  ),
  "weighed" AS (
    SELECT
      "confidence",
      power(0.5, COALESCE(EXTRACT(EPOCH FROM (MAX("at") OVER () - "at")), 0) / 86400 / 180) AS "weight"
    FROM "scored"
  )
  SELECT LEAST(
    round(SUM("confidence" * "weight") / SUM("weight"))::integer,
    CASE lower("dateConfidence")
      WHEN 'estimated' THEN 65
      WHEN 'delayed'   THEN 55
      WHEN 'unknown'   THEN 40
    END)
  FROM "weighed"
$$;

SELECT "pinConfidenceRebuild"();
