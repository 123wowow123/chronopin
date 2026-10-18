-- A tag read out of a pin's own prose ("auto") that calls a body's year a win
-- gives way to the award catalogue when the catalogue lists only nominations
-- for the work there: Vinland Saga's description says it won Anime of the
-- Year at the 2020 Crunchyroll Anime Awards, which it was only nominated for.
-- The catalogue's "... Nominee" tag stands instead. Tags typed by hand stay.
-- The rest is 0040's view unchanged.
CREATE OR REPLACE VIEW "PinTagView" AS
SELECT DISTINCT ON ("pinId", "name") "pinId", "name", "kind", "source"
FROM (
    SELECT "t"."pinId", "t"."name", "t"."kind", "t"."source", CASE "t"."source" WHEN 'user' THEN 0 ELSE 1 END AS "rank"
    FROM "PinTag" AS "t"
    WHERE NOT ("t"."source" = 'auto' AND "t"."kind" = 'award' AND EXISTS (
      SELECT 1 FROM "PinAward" AS "a"
      WHERE "a"."pinId" = "t"."pinId" AND ("a"."body" || ' ' || "a"."year")::citext = "t"."name"
      GROUP BY "a"."pinId"
      HAVING bool_and("a"."result" = 'nominated')
    ))
  UNION ALL
    SELECT DISTINCT "pinId", ("body" || ' ' || "year")::citext, 'award', 'award', 2
    FROM "PinAward"
    WHERE "result" = 'won'
  UNION ALL
    SELECT "pinId", ("body" || ' ' || "year" || ' Nominee')::citext, 'nomination', 'award', 2
    FROM "PinAward"
    GROUP BY "pinId", "body", "year"
    HAVING bool_and("result" = 'nominated')
) AS "all"
ORDER BY "pinId", "name", "rank";
