-- A pin's overall confidence (0-100) in SQL, so the home timeline can leave
-- out weakly supported pins while still paging full pages. This mirrors
-- pinEvidence + pinConfidence in src/lib/referenceConfidence.ts - change both
-- together:
--
--   * the evidence is the pin's references plus its sourceUrl, unless a
--     reference repeats that URL; the source is scored from dateConfidence
--     and dated by when the pin was posted
--   * each scored item weighs half as much for every 180 days it is older
--     than the newest dated item; undated items weigh as much as the newest
--   * the result is the weighted average, rounded; NULL when nothing is scored
--
-- "references" is the json array PinBaseView carries.

CREATE FUNCTION "pinConfidence"(
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
  SELECT round(SUM("confidence" * "weight") / SUM("weight"))::integer FROM "weighed"
$$;
