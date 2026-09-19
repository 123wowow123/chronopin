-- Award tags are wins only: a pin tagged "Crunchyroll Anime Awards 2025" read
-- as a winner even when its work was only nominated. Nominations stay in
-- PinAward and on the pin page's Awards section, folded under the wins.
-- The rest is 0038's view unchanged.
CREATE OR REPLACE VIEW "PinTagView" AS
SELECT DISTINCT ON ("pinId", "name") "pinId", "name", "kind", "source"
FROM (
    SELECT "pinId", "name", "kind", "source", CASE "source" WHEN 'user' THEN 0 ELSE 1 END AS "rank"
    FROM "PinTag"
  UNION ALL
    SELECT DISTINCT "pinId", ("body" || ' ' || "year")::citext, 'award', 'award', 2
    FROM "PinAward"
    WHERE "result" = 'won'
) AS "all"
ORDER BY "pinId", "name", "rank";
